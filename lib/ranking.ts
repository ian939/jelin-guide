// 랭킹 집계 (KST 기준)
//
// - 이달의 심사위원 (monthly jury): 이번 달 작성된 활성 리뷰 수
// - 명예의 전당 (hall of fame): 누적 활성 리뷰 수
// - 제안 랭킹 (proposal): 누적 활성 가맹점 제안 수
//
// MVP에선 디케이·표준편차 가중 등을 적용하지 않는다(설계서 6.6: P7 결정).
// 캐시 주기는 우선 5분 in-memory.

import { prisma } from '@/lib/db'

export type RankRow = { userId: string; nickname: string; count: number }

const CACHE_TTL_MS = 5 * 60 * 1000
type CacheKey = 'monthly' | 'hall' | 'proposal'
const cache = new Map<CacheKey, { at: number; rows: RankRow[] }>()

function startOfMonthKST(date = new Date()): Date {
  // KST = UTC+9. 입력을 +9h 이동시키면 UTC로 추출한 연·월이 사실상 KST의 연·월이 된다.
  const kstShifted = new Date(date.getTime() + 9 * 60 * 60_000)
  const year = kstShifted.getUTCFullYear()
  const month = kstShifted.getUTCMonth()
  // KST 1일 00:00 = UTC 전월 말일 15:00
  return new Date(Date.UTC(year, month, 1) - 9 * 60 * 60_000)
}

async function compute(kind: CacheKey, limit: number): Promise<RankRow[]> {
  if (kind === 'proposal') {
    const grouped = await prisma.place.groupBy({
      by: ['createdById'],
      where: { isHidden: false },
      _count: true,
      orderBy: { _count: { createdById: 'desc' } },
      take: limit,
    })
    return enrich(grouped.map(g => ({ userId: g.createdById, count: g._count })))
  }
  const where: any = { isHidden: false }
  if (kind === 'monthly') where.createdAt = { gte: startOfMonthKST() }
  const grouped = await prisma.review.groupBy({
    by: ['authorId'],
    where,
    _count: true,
    orderBy: { _count: { authorId: 'desc' } },
    take: limit,
  })
  return enrich(grouped.map(g => ({ userId: g.authorId, count: g._count })))
}

async function enrich(rows: { userId: string; count: number }[]): Promise<RankRow[]> {
  if (rows.length === 0) return []
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map(r => r.userId) } },
    select: { id: true, nickname: true },
  })
  const map = new Map(users.map(u => [u.id, u.nickname]))
  return rows.map(r => ({ ...r, nickname: map.get(r.userId) ?? '익명' }))
}

async function cached(kind: CacheKey, limit: number): Promise<RankRow[]> {
  const hit = cache.get(kind)
  const now = Date.now()
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.rows.slice(0, limit)
  const fresh = await compute(kind, Math.max(50, limit))
  cache.set(kind, { at: now, rows: fresh })
  return fresh.slice(0, limit)
}

export const getMonthlyJury = (limit = 10) => cached('monthly', limit)
export const getHallOfFame = (limit = 10) => cached('hall', limit)
export const getProposalRanking = (limit = 10) => cached('proposal', limit)

export async function getMyRanks(userId: string) {
  const [monthly, hall, proposal] = await Promise.all([
    getMonthlyJury(500),
    getHallOfFame(500),
    getProposalRanking(500),
  ])
  return {
    monthly: positionOf(monthly, userId),
    hall: positionOf(hall, userId),
    proposal: positionOf(proposal, userId),
  }
}

function positionOf(rows: RankRow[], userId: string): number | null {
  const idx = rows.findIndex(r => r.userId === userId)
  return idx >= 0 ? idx + 1 : null
}

// 테스트용 (lib/__tests__/ranking.test.ts에서 사용)
export const __test__ = { startOfMonthKST }
