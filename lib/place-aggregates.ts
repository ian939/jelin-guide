import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './db'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Place.reviewCount·avgScore를 실 review 데이터에서 다시 계산해 갱신.
 * 리뷰 생성·수정·삭제·hide 토글 후 호출. 트랜잭션 안에서 호출 시 같은 tx를 넘기면 atomic.
 */
export async function recomputePlaceAggregates(placeId: string, db: Db = prisma) {
  const agg = await db.review.aggregate({
    where: { placeId, isHidden: false },
    _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
    _count: true,
  })
  const avg =
    agg._avg.scoreTaste !== null
      ? (agg._avg.scoreTaste! + agg._avg.scoreValue! + agg._avg.scoreAtmosphere!) / 3
      : null
  await db.place.update({
    where: { id: placeId },
    data: { reviewCount: agg._count, avgScore: avg },
  })
}
