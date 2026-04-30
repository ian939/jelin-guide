import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './db'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Place.reviewCount·avgScore·crewVerified를 실 review·vote 데이터에서 다시 계산해 갱신.
 * 리뷰 CRUD·hide 토글, 제로페이 vote 작성·변경 후 호출.
 * 트랜잭션 안에서 호출 시 같은 tx를 넘기면 atomic.
 *
 * crewVerified: 리뷰 1+ OR 제로페이 vote(YES) 1+. 크루가 직접 다녀온 사실(맛 또는 결제) 증거.
 */
export async function recomputePlaceAggregates(placeId: string, db: Db = prisma) {
  const [agg, yesVotes] = await Promise.all([
    db.review.aggregate({
      where: { placeId, isHidden: false },
      _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
      _count: true,
    }),
    db.zeropayVote.count({ where: { placeId, isAvailable: true } }),
  ])
  const avg =
    agg._avg.scoreTaste !== null
      ? (agg._avg.scoreTaste! + agg._avg.scoreValue! + agg._avg.scoreAtmosphere!) / 3
      : null
  const crewVerified = agg._count > 0 || yesVotes > 0
  await db.place.update({
    where: { id: placeId },
    data: { reviewCount: agg._count, avgScore: avg, crewVerified },
  })
}
