/**
 * 월간 사내 결제 랭킹(.xlsx) → DB Place 매칭 → 자동 검증.
 *
 * 흐름:
 *   1) xlsx 파싱 (시트1 의 사용처/사용처 주소/방문수)
 *   2) DB Place 전체와 이름·주소 이중 매칭
 *   3) dry-run (default): output/ranking-match-YYYY-MM-WX.csv 출력
 *   4) --apply: MATCHED 항목에 회사장부의 ZeropayVote(YES) upsert + zeropaySelfReport=true
 *      + recomputePlaceAggregates → crewVerified 자동 true
 *
 * 실행:
 *   pnpm tsx scripts/apply-monthly-ranking.ts                 # dry-run
 *   pnpm tsx scripts/apply-monthly-ranking.ts -- --apply      # 실 변경
 *   pnpm tsx scripts/apply-monthly-ranking.ts -- --file=...   # 다른 xlsx 경로
 */
import bcrypt from 'bcryptjs'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { prisma } from '../lib/db'
import { recomputePlaceAggregates } from '../lib/place-aggregates'
import { nameSimilarity } from '../lib/places'
import type { Place } from '@prisma/client'

const LEDGER_NICKNAME = '회사장부'

// ---------- args ----------
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const fileArg = args.find(a => a.startsWith('--file='))
const XLSX_PATH = fileArg
  ? resolve(process.cwd(), fileArg.slice('--file='.length))
  : resolve(process.cwd(), 'input/4월 4주차 랭킹.xlsx')

// ---------- 매칭 유틸 ----------
function norm(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\(.*?\)/g, '')
    .replace(/[\s\-,.()（）&:[\]]/g, '')
    .toLowerCase()
}

// '서울특별시 강남구 학동로37길 23 ...' → '학동로37길23' 같은 정규화 토큰
function roadToken(addr: string): string | null {
  const m = addr.match(/([가-힣]+로\d*길|[가-힣]+대로|[가-힣]+로)\s*(\d+(?:-\d+)?)/)
  return m ? norm(`${m[1]}${m[2]}`) : null
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

// ---------- xlsx 파싱 ----------
type RankRow = { name: string; addr: string; visits: number }

function readXlsxRows(path: string): RankRow[] {
  const wb = XLSX.readFile(path)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  // 컬럼: 사용처 / 사용처 주소 / 방문수 (헤더 변형 대비 fallback 시도)
  return json
    .map(row => {
      const keys = Object.keys(row)
      const k = (...candidates: string[]) =>
        candidates.find(c => keys.some(k => k.replace(/\s/g, '') === c.replace(/\s/g, ''))) ?? ''
      const findKey = (label: string) =>
        keys.find(key => key.replace(/\s/g, '').includes(label.replace(/\s/g, ''))) ?? ''
      const nameKey = findKey('사용처') && !findKey('사용처주소').includes('주소')
        ? findKey('사용처')
        : keys.find(x => x.includes('사용처') && !x.includes('주소')) ?? ''
      const addrKey = keys.find(x => x.includes('주소')) ?? ''
      const visitsKey = keys.find(x => x.includes('방문') || x.includes('횟수') || x.includes('수')) ?? ''
      const name = String(row[nameKey] ?? '').trim()
      const addr = String(row[addrKey] ?? '').trim()
      const visits = Number(row[visitsKey] ?? 0) || 0
      void k
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

// ---------- main ----------
async function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`file: ${XLSX_PATH}`)

  const rows = readXlsxRows(XLSX_PATH)
  console.log(`xlsx rows: ${rows.length}`)

  const places = await prisma.place.findMany({ where: { isHidden: false } })
  console.log(`db places: ${places.length}`)

  const out: string[][] = []
  out.push(['xlsx_name', 'xlsx_addr', 'visits', 'status', 'db_id', 'db_name', 'db_addr', 'score', 'candidates'])

  let matched = 0
  let ambiguous = 0
  let notFound = 0
  let notFoundAddr = 0
  const matchedPairs: { row: RankRow; place: Place }[] = []

  for (const r of rows) {
    const m = findMatch(r.name, r.addr, places)
    if (m.status === 'MATCHED') {
      matched++
      matchedPairs.push({ row: r, place: m.place })
      out.push([r.name, r.addr, String(r.visits), 'MATCHED', m.place.id, m.place.name, m.place.address, m.score.toFixed(2), ''])
    } else if (m.status === 'AMBIGUOUS') {
      ambiguous++
      const cands = m.candidates.map(c => `${c.place.name}(${c.score.toFixed(2)})`).join(' | ')
      out.push([r.name, r.addr, String(r.visits), 'AMBIGUOUS', '', '', '', '', cands])
    } else if (m.status === 'NOT_FOUND_ADDR') {
      notFoundAddr++
      out.push([r.name, r.addr, String(r.visits), 'NOT_FOUND_ADDR', '', '', '', '', ''])
    } else {
      notFound++
      out.push([r.name, r.addr, String(r.visits), 'NOT_FOUND', '', '', '', '', ''])
    }
  }

  // CSV 산출
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const csvPath = resolve(process.cwd(), `output/ranking-match-${yyyy}${mm}${dd}.csv`)
  const csv = '﻿' + out.map(r => r.map(csvEscape).join(',')).join('\n')
  writeFileSync(csvPath, csv, 'utf8')
  console.log(`csv: ${csvPath}`)
  console.log('')
  console.log(`MATCHED: ${matched} / AMBIGUOUS: ${ambiguous} / NOT_FOUND: ${notFound} / NOT_FOUND_ADDR: ${notFoundAddr}`)

  if (!APPLY) {
    console.log('\n(dry-run) --apply 플래그 없이는 DB 변경 안 함.')
    return
  }

  // APPLY
  const ledger = await ensureLedger()
  console.log(`\nledger user: ${ledger.nickname} (${ledger.id})`)
  console.log(`apply ${matchedPairs.length} place(s)...`)

  for (const { row, place } of matchedPairs) {
    await prisma.$transaction(async tx => {
      await tx.zeropayVote.upsert({
        where: { placeId_voterId: { placeId: place.id, voterId: ledger.id } },
        create: { placeId: place.id, voterId: ledger.id, isAvailable: true },
        update: { isAvailable: true },
      })
      await tx.place.update({
        where: { id: place.id },
        data: { zeropaySelfReport: true },
      })
      await recomputePlaceAggregates(place.id, tx)
    })
    console.log(`  ✓ ${place.name}  ←  ${row.name}`)
  }

  console.log(`\n✓ ${matchedPairs.length}건 적용 완료`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
