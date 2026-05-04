/**
 * 월간 사내 결제 랭킹(.xlsx) → DB Place 매칭 → 자동 검증.
 *
 * 단계:
 *   1) xlsx 파싱 (사용처 / 사용처 주소 / 방문수)
 *   2) DB Place 전체와 이름·주소 이중 매칭
 *      - MATCHED       : 같은 가게 1건 단정
 *      - ALIAS_MATCH   : 이름은 다르지만 좌표 50m 이내 → 같은 가게 (별칭/회사명/축약명)
 *      - REGISTRABLE   : 학동 일대(주소에 강남구) NOT_FOUND → 신규 등록 후보
 *      - SKIPPED       : 학동 밖 (영등포·송파 등) 또는 geocode 실패
 *   3) dry-run (default) : output/ranking-match-YYYYMMDD.csv 출력
 *   4) --apply           : MATCHED·ALIAS_MATCH 에 회사장부 vote(YES) + zeropaySelfReport=true,
 *                          REGISTRABLE 에 신규 Place 생성(createdBy=회사장부) + vote
 *                          모든 적용 후 recomputePlaceAggregates → crewVerified 자동 true.
 *
 * 실행:
 *   pnpm tsx scripts/apply-monthly-ranking.ts                 # dry-run
 *   pnpm tsx scripts/apply-monthly-ranking.ts -- --apply      # 실 변경
 *   pnpm tsx scripts/apply-monthly-ranking.ts -- --file=...   # 다른 xlsx
 *
 * 자세한 운영 절차는 docs/사내랭킹.md 참고.
 */
import bcrypt from 'bcryptjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { prisma } from '../lib/db'
import { geocodeAddress } from '../lib/geocode'
import { recomputePlaceAggregates } from '../lib/place-aggregates'
import { haversineMeters, nameSimilarity } from '../lib/places'
import {
  CATEGORIES,
  MEAL_TYPES,
  PLACE_TAGS,
  type CategoryCode,
  type MealTypeCode,
  type PlaceTag,
} from '../lib/validators/place'
import type { Place } from '@prisma/client'

const LEDGER_NICKNAME = '회사장부'

// ---------- args ----------
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const fileArg = args.find(a => a.startsWith('--file='))
const periodArg = args.find(a => a.startsWith('--period='))
const XLSX_PATH = fileArg
  ? resolve(process.cwd(), fileArg.slice('--file='.length))
  : resolve(process.cwd(), 'input/4월 4주차 랭킹.xlsx')

// ---------- period 추정 ----------
// 파일명 'X월 Y주차 랭킹.xlsx' → 'YYYY-MM' (현재 연도). --period= 으로 override.
function inferPeriod(): { key: string; label: string } {
  if (periodArg) {
    const k = periodArg.slice('--period='.length)
    const m = k.match(/^(\d{4})-(\d{2})$/)
    if (!m) throw new Error('--period must be YYYY-MM')
    return { key: k, label: `${parseInt(m[2], 10)}월의 크루 방문 랭킹` }
  }
  const fname = basename(XLSX_PATH)
  const m = fname.match(/(\d+)\s*월/)
  if (!m) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    return { key: `${yyyy}-${mm}`, label: `${parseInt(mm, 10)}월의 크루 방문 랭킹` }
  }
  const month = parseInt(m[1], 10)
  const year = new Date().getFullYear()
  return { key: `${year}-${String(month).padStart(2, '0')}`, label: `${month}월의 크루 방문 랭킹` }
}

// SK일렉링크 (논현동 83-15) — 도보 5분 태그 부여 기준점
const SK_LAT = 37.5167124
const SK_LNG = 127.0339445
const WALK_5MIN_M = 350

// ---------- 매칭 유틸 ----------
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

// 학동 일대 판별 — 주소에 '강남구' 포함
function isInJakdongArea(addr: string): boolean {
  return addr.includes('강남구')
}

// 가게 이름 → 카테고리 휴리스틱 추정. 학동 일대 다수가 한식이라 default KOREAN.
function guessCategory(name: string): CategoryCode {
  const n = name.toLowerCase()
  if (/(커피|카페|cafe|coffee|이디야|스타벅스|투썸|컴포즈|폴바셋|할리스|블루보틀|tom n toms)/i.test(n)) return 'CAFE'
  if (/(편의점|gs25|cu|세븐일레븐|이마트24|미니스톱)/i.test(n)) return 'ETC'
  if (/(써브웨이|포케|샐러드|버거|피자|파스타|스테이크|이탈리|양식|세븐일레븐)/.test(n)) return 'WESTERN'
  if (/(초밥|스시|sushi|돈가스|카츠|라멘|우동|소바|이자카야|규동|덴푸라|타카이|나베|아부라)/i.test(n)) return 'JAPANESE'
  if (/(짬뽕|짜장|마라|훠궈|양꼬치|중화|중국|딤섬|차이나|천미향)/i.test(n)) return 'CHINESE'
  if (/(분식|떡볶이|순대|김밥|만두)/i.test(n)) return 'SNACK'
  if (/(주점|이자카야|호프|맥주|와인|바)/i.test(n)) return 'BAR'
  if (/(곰탕|국밥|해장|찌개|불고기|삼겹|갈비|족발|보쌈|냉면|곱창|닭|치킨|뼈|순두부|닭갈비|한정식|한식)/i.test(n))
    return 'KOREAN'
  return 'KOREAN' // 학동 일대 default
}

function computeAutoTags(lat: number, lng: number): PlaceTag[] {
  const d = haversineMeters({ lat: SK_LAT, lng: SK_LNG }, { lat, lng })
  const tags: PlaceTag[] = []
  if (d <= WALK_5MIN_M && (PLACE_TAGS as readonly string[]).includes('도보 5분')) {
    tags.push('도보 5분' as PlaceTag)
  }
  return tags
}

type MatchResult =
  | { status: 'MATCHED'; place: Place; score: number }
  | { status: 'AMBIGUOUS'; candidates: { place: Place; score: number }[] }
  | { status: 'NOT_FOUND' }
  | { status: 'NOT_FOUND_ADDR' }

function findMatch(xName: string, xAddr: string, places: Place[]): MatchResult {
  const xn = norm(xName)
  const xt = roadToken(xAddr)
  if (!xt) return { status: 'NOT_FOUND_ADDR' }

  const scored = places.map(p => {
    const pn = norm(p.name)
    const pt = roadToken(p.address)
    const nameSim =
      xn === pn ? 1
      : pn.includes(xn) || xn.includes(pn) ? 0.85
      : nameSimilarity(xn, pn)
    const addrMatch = pt ? pt.includes(xt) || xt.includes(pt) : norm(p.address).includes(xt)
    return { place: p, nameSim, addrMatch }
  })
  const ok = scored.filter(s => s.addrMatch && s.nameSim >= 0.55)
  if (ok.length === 0) return { status: 'NOT_FOUND' }
  ok.sort((a, b) => b.nameSim - a.nameSim)
  if (ok.length >= 2 && ok[0].nameSim - ok[1].nameSim < 0.05) {
    return {
      status: 'AMBIGUOUS',
      candidates: ok.slice(0, 3).map(s => ({ place: s.place, score: s.nameSim })),
    }
  }
  return { status: 'MATCHED', place: ok[0].place, score: ok[0].nameSim }
}

// 좌표 50m 이내 + 이름 유사도 ≥ 0.7 → alias (같은 가게로 단정).
// 학동은 좁은 지역이라 좌표가 가깝기만 한 다른 가게가 흔함 — 이름 유사도가 충분할 때만 alias.
// 미흡한 경우는 그냥 신규 가게로 등록해서 운영자가 사후 정리.
function findAlias(
  lat: number,
  lng: number,
  xName: string,
  places: Place[]
): { place: Place; nameSim: number; distM: number } | null {
  const xn = norm(xName)
  let best: { place: Place; nameSim: number; distM: number } | null = null
  for (const p of places) {
    const distM = haversineMeters({ lat: p.lat, lng: p.lng }, { lat, lng })
    if (distM > 50) continue
    const pn = norm(p.name)
    const sim = xn === pn ? 1 : pn.includes(xn) || xn.includes(pn) ? 0.85 : nameSimilarity(xn, pn)
    if (sim < 0.7) continue
    if (!best || sim > best.nameSim) best = { place: p, nameSim: sim, distM }
  }
  return best
}

// ---------- xlsx 파싱 ----------
type RankRow = { name: string; addr: string; visits: number }

function readXlsxRows(path: string): RankRow[] {
  const wb = XLSX.readFile(path)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return json
    .map(row => {
      const keys = Object.keys(row)
      const nameKey = keys.find(x => x.includes('사용처') && !x.includes('주소')) ?? ''
      const addrKey = keys.find(x => x.includes('주소')) ?? ''
      const visitsKey = keys.find(x => x.includes('방문') || x.includes('횟수') || x === '수') ?? ''
      const name = String(row[nameKey] ?? '').trim()
      const addr = String(row[addrKey] ?? '').trim()
      const visits = Number(row[visitsKey] ?? 0) || 0
      return { name, addr, visits }
    })
    .filter(r => r.name && r.addr)
}

// ---------- CSV ----------
function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  const t = s.replace(/"/g, '""')
  return /[",\n]/.test(t) ? `"${t}"` : t
}

// ---------- system user ----------
async function ensureLedger() {
  const existing = await prisma.user.findUnique({ where: { nickname: LEDGER_NICKNAME } })
  if (existing) return existing
  const passwordHash = await bcrypt.hash(crypto.randomUUID() + Date.now(), 10)
  return prisma.user.create({
    data: { nickname: LEDGER_NICKNAME, passwordHash, email: null },
  })
}

// ---------- 분류 결과 ----------
type Resolution =
  | { kind: 'MATCHED'; row: RankRow; place: Place; score: number }
  | { kind: 'ALIAS_MATCH'; row: RankRow; place: Place; nameSim: number; distM: number; geo: { lat: number; lng: number } }
  | { kind: 'HIDDEN_DUP'; row: RankRow; place: Place; distM: number }
  | { kind: 'REGISTRABLE'; row: RankRow; geo: { lat: number; lng: number; canonicalAddress: string } }
  | { kind: 'AMBIGUOUS'; row: RankRow; candidates: { place: Place; score: number }[] }
  | { kind: 'GEOCODE_FAILED'; row: RankRow }
  | { kind: 'OUT_OF_AREA'; row: RankRow }
  | { kind: 'NOT_FOUND_ADDR'; row: RankRow }

async function resolveRow(
  r: RankRow,
  activePlaces: Place[],
  hiddenPlaces: Place[]
): Promise<Resolution> {
  const m = findMatch(r.name, r.addr, activePlaces)
  if (m.status === 'MATCHED') return { kind: 'MATCHED', row: r, place: m.place, score: m.score }
  if (m.status === 'AMBIGUOUS') return { kind: 'AMBIGUOUS', row: r, candidates: m.candidates }
  if (m.status === 'NOT_FOUND_ADDR') return { kind: 'NOT_FOUND_ADDR', row: r }

  // NOT_FOUND — 학동 일대만 후속 처리
  if (!isInJakdongArea(r.addr)) return { kind: 'OUT_OF_AREA', row: r }
  const geo = await geocodeAddress(r.addr)
  if (!geo) return { kind: 'GEOCODE_FAILED', row: r }

  // 운영자가 이미 hide한 가게가 같은 좌표에 있으면 신규 등록 막음 — 의도된 결정 보존
  for (const h of hiddenPlaces) {
    const distM = haversineMeters({ lat: h.lat, lng: h.lng }, { lat: geo.lat, lng: geo.lng })
    if (distM <= 50) {
      return { kind: 'HIDDEN_DUP', row: r, place: h, distM }
    }
  }

  // 좌표 50m + 이름 유사도 ≥ 0.7 → alias 단정
  const alias = findAlias(geo.lat, geo.lng, r.name, activePlaces)
  if (alias) {
    return {
      kind: 'ALIAS_MATCH',
      row: r,
      place: alias.place,
      nameSim: alias.nameSim,
      distM: alias.distM,
      geo: { lat: geo.lat, lng: geo.lng },
    }
  }
  return { kind: 'REGISTRABLE', row: r, geo }
}

// ---------- main ----------
async function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`file: ${XLSX_PATH}`)

  const rows = readXlsxRows(XLSX_PATH)
  console.log(`xlsx rows: ${rows.length}`)

  let places = await prisma.place.findMany({ where: { isHidden: false } })
  const hiddenPlaces = await prisma.place.findMany({ where: { isHidden: true } })
  console.log(`db places: ${places.length} (hidden: ${hiddenPlaces.length})`)

  console.log('\n분류 중 (geocode 호출 포함)...')
  const resolutions: Resolution[] = []
  for (const r of rows) {
    resolutions.push(await resolveRow(r, places, hiddenPlaces))
  }

  // 통계
  const counts: Record<string, number> = {}
  for (const r of resolutions) counts[r.kind] = (counts[r.kind] ?? 0) + 1

  // CSV 산출
  const out: string[][] = []
  out.push(['xlsx_name', 'xlsx_addr', 'visits', 'kind', 'db_id', 'db_name', 'db_addr', 'extra'])
  for (const r of resolutions) {
    const x = r.row
    if (r.kind === 'MATCHED') {
      out.push([x.name, x.addr, String(x.visits), 'MATCHED', r.place.id, r.place.name, r.place.address, `score=${r.score.toFixed(2)}`])
    } else if (r.kind === 'ALIAS_MATCH') {
      out.push([x.name, x.addr, String(x.visits), 'ALIAS_MATCH', r.place.id, r.place.name, r.place.address, `nameSim=${r.nameSim.toFixed(2)}, dist=${r.distM.toFixed(0)}m`])
    } else if (r.kind === 'HIDDEN_DUP') {
      out.push([x.name, x.addr, String(x.visits), 'HIDDEN_DUP', r.place.id, r.place.name, r.place.address, `dist=${r.distM.toFixed(0)}m (hidden 가게와 같은 좌표 — 운영자 결정 보존)`])
    } else if (r.kind === 'REGISTRABLE') {
      out.push([x.name, x.addr, String(x.visits), 'REGISTRABLE', '', '', r.geo.canonicalAddress, `lat=${r.geo.lat.toFixed(6)}, lng=${r.geo.lng.toFixed(6)}`])
    } else if (r.kind === 'AMBIGUOUS') {
      const cands = r.candidates.map(c => `${c.place.name}(${c.score.toFixed(2)})`).join(' | ')
      out.push([x.name, x.addr, String(x.visits), 'AMBIGUOUS', '', '', '', cands])
    } else {
      out.push([x.name, x.addr, String(x.visits), r.kind, '', '', '', ''])
    }
  }

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const csvPath = resolve(process.cwd(), `output/ranking-match-${yyyy}${mm}${dd}.csv`)
  const csv = '﻿' + out.map(r => r.map(csvEscape).join(',')).join('\n')
  writeFileSync(csvPath, csv, 'utf8')
  console.log(`csv: ${csvPath}`)
  console.log('')
  for (const k of Object.keys(counts).sort()) {
    console.log(`  ${k}: ${counts[k]}`)
  }

  if (!APPLY) {
    console.log('\n(dry-run) --apply 플래그 없이는 DB 변경 안 함.')
    return
  }

  // APPLY
  const ledger = await ensureLedger()
  console.log(`\nledger user: ${ledger.nickname} (${ledger.id})`)

  let appliedVote = 0
  let registered = 0

  for (const r of resolutions) {
    if (r.kind === 'MATCHED' || r.kind === 'ALIAS_MATCH') {
      const place = r.place
      await prisma.$transaction(async tx => {
        await tx.zeropayVote.upsert({
          where: { placeId_voterId: { placeId: place.id, voterId: ledger.id } },
          create: { placeId: place.id, voterId: ledger.id, isAvailable: true },
          update: { isAvailable: true },
        })
        await tx.place.update({ where: { id: place.id }, data: { zeropaySelfReport: true } })
        await recomputePlaceAggregates(place.id, tx)
      })
      appliedVote++
      const tag = r.kind === 'ALIAS_MATCH' ? '↔' : '✓'
      console.log(`  ${tag} ${place.name}  ←  ${r.row.name}`)
    } else if (r.kind === 'REGISTRABLE') {
      const x = r.row
      const category = guessCategory(x.name)
      const mealType: MealTypeCode = (MEAL_TYPES as readonly string[]).includes('LUNCH')
        ? 'LUNCH'
        : 'LUNCH'
      const tags = computeAutoTags(r.geo.lat, r.geo.lng)

      const place = await prisma.$transaction(async tx => {
        const p = await tx.place.create({
          data: {
            name: x.name,
            address: r.geo.canonicalAddress,
            lat: r.geo.lat,
            lng: r.geo.lng,
            category,
            mealType,
            zeropaySelfReport: true,
            menuMemo: null,
            priceMemo: null,
            recommendReason: null,
            tags,
            createdById: ledger.id,
          },
        })
        await tx.placeRevision.create({
          data: {
            placeId: p.id,
            name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            mealType: p.mealType,
            zeropaySelfReport: p.zeropaySelfReport,
            menuMemo: p.menuMemo,
            priceMemo: p.priceMemo,
            recommendReason: p.recommendReason,
            tags: p.tags,
            editorId: ledger.id,
          },
        })
        await tx.zeropayVote.create({
          data: { placeId: p.id, voterId: ledger.id, isAvailable: true },
        })
        await recomputePlaceAggregates(p.id, tx)
        return p
      })
      registered++
      console.log(`  + ${place.name} (${category}) [${tags.join(',') || '-'}]`)
      // 후속 alias 검사 위해 places 목록에 추가 (같은 batch 내 중복 등록 방지)
      places = [...places, place]
    }
  }

  // CATEGORIES sanity (빌드 cleanliness)
  void CATEGORIES

  console.log(`\n✓ vote 적용: ${appliedVote}건 / 신규 등록: ${registered}건`)

  // ---------- monthly-visits.json 갱신 ----------
  const period = inferPeriod()
  const visitsPath = resolve(process.cwd(), 'data/monthly-visits.json')
  const visitsRaw = (() => {
    try {
      return readFileSync(visitsPath, 'utf8')
    } catch {
      return '{}'
    }
  })()
  type VisitItem = { placeId: string; visits: number }
  type VisitsJson = Record<string, { label: string; items: VisitItem[] }>
  const visits: VisitsJson = JSON.parse(visitsRaw || '{}')
  const items: VisitItem[] = []
  for (const r of resolutions) {
    if (r.kind === 'MATCHED' || r.kind === 'ALIAS_MATCH') {
      items.push({ placeId: r.place.id, visits: r.row.visits })
    } else if (r.kind === 'REGISTRABLE') {
      // 방금 등록된 가게 — places 배열의 마지막 원소들 중 이름 매칭으로 placeId 찾기
      const created = places.find(p => p.name === r.row.name)
      if (created) items.push({ placeId: created.id, visits: r.row.visits })
    }
  }
  // visits 내림차순으로 정렬
  items.sort((a, b) => b.visits - a.visits)
  visits[period.key] = { label: period.label, items }
  writeFileSync(visitsPath, JSON.stringify(visits, null, 2) + '\n', 'utf8')
  console.log(`monthly-visits.json: ${period.key} → ${items.length} items`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
