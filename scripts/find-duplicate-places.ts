/**
 * 중복 가게 후보 탐지 — 좌표 기반 + 같은 도로명·번지 페어를 CSV로 출력.
 * 운영자 검수용. 실 변경 안 함.
 *
 *   pnpm tsx scripts/find-duplicate-places.ts
 *
 * 출력: output/duplicates-YYYYMMDD.csv
 *   - 좌표 50m 이내 + (이름 유사도 ≥ 0.3 OR 도로명+번지 동일)
 *   - 행마다 두 가게 비교 정보 + 등록자
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../lib/db'
import { haversineMeters, nameSimilarity } from '../lib/places'

function norm(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\(.*?\)/g, '')
    .replace(/[\s\-,.()（）&:[\]]/g, '')
    .toLowerCase()
}

function roadToken(addr: string): string | null {
  const m = addr.match(/([가-힣]+로\d*길|[가-힣]+대로|[가-힣]+로)\s*(\d+(?:-\d+)?)/)
  return m ? norm(`${m[1]}${m[2]}`) : null
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  const t = s.replace(/"/g, '""')
  return /[",\n]/.test(t) ? `"${t}"` : t
}

const NEAR_M = 50

async function main() {
  const places = await prisma.place.findMany({
    where: { isHidden: false },
    include: { createdBy: { select: { nickname: true } } },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`places: ${places.length}`)

  type Pair = {
    a: (typeof places)[number]
    b: (typeof places)[number]
    distM: number
    nameSim: number
    sameRoad: boolean
  }
  const pairs: Pair[] = []
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const a = places[i]
      const b = places[j]
      const distM = haversineMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng })
      if (distM > NEAR_M) continue
      const nameSim = nameSimilarity(norm(a.name), norm(b.name))
      const ta = roadToken(a.address)
      const tb = roadToken(b.address)
      const sameRoad = !!(ta && tb && ta === tb)
      // 좌표 50m + (이름 유사도 ≥ 0.3 OR 같은 도로명·번지)
      if (nameSim < 0.3 && !sameRoad) continue
      pairs.push({ a, b, distM, nameSim, sameRoad })
    }
  }
  // 우선순위: 같은 도로 + 이름 유사도 높은 순
  pairs.sort((p, q) => {
    if (p.sameRoad !== q.sameRoad) return p.sameRoad ? -1 : 1
    return q.nameSim - p.nameSim
  })

  console.log(`duplicate candidates: ${pairs.length}`)

  const out: string[][] = []
  out.push([
    'A_id', 'A_name', 'A_addr', 'A_by',
    'B_id', 'B_name', 'B_addr', 'B_by',
    'dist_m', 'name_sim', 'same_road_token',
  ])
  for (const p of pairs) {
    out.push([
      p.a.id, p.a.name, p.a.address, p.a.createdBy.nickname,
      p.b.id, p.b.name, p.b.address, p.b.createdBy.nickname,
      p.distM.toFixed(1),
      p.nameSim.toFixed(2),
      p.sameRoad ? 'Y' : '',
    ])
  }
  const today = new Date()
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const path = resolve(process.cwd(), `output/duplicates-${stamp}.csv`)
  const csv = '﻿' + out.map(r => r.map(csvEscape).join(',')).join('\n')
  writeFileSync(path, csv, 'utf8')
  console.log(`csv: ${path}`)

  // 콘솔 미리보기
  console.log('')
  for (const p of pairs.slice(0, 60)) {
    const flag = p.sameRoad ? '★' : ' '
    console.log(`${flag} ${p.distM.toFixed(0).padStart(3)}m sim=${p.nameSim.toFixed(2)}  ${p.a.name} (${p.a.createdBy.nickname})`)
    console.log(`              ↔ ${p.b.name} (${p.b.createdBy.nickname})`)
    console.log(`              ${p.a.address}`)
    console.log(`              ${p.b.address}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
