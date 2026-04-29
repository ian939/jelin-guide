import { prisma } from '@/lib/db'
import { recomputePlaceAggregates } from '@/lib/place-aggregates'
import { REPORT_AUTOHIDE_THRESHOLD } from '@/lib/validators/report'

/**
 * 신고 INSERT 후 자동 숨김 임계 도달 시 대상 항목의 isHidden을 true로 셋한다.
 * 멱등 — 이미 숨김 상태여도 안전하게 호출 가능.
 */
export async function maybeAutoHide(targetType: 'REVIEW' | 'PLACE', targetId: string) {
  const count = await prisma.report.count({
    where: { targetType, targetId, resolution: 'PENDING' },
  })
  if (count < REPORT_AUTOHIDE_THRESHOLD) return false
  if (targetType === 'REVIEW') {
    const updated = await prisma.review.update({
      where: { id: targetId },
      data: { isHidden: true, hiddenAt: new Date() },
      select: { placeId: true },
    })
    await recomputePlaceAggregates(updated.placeId)
  } else {
    await prisma.place.update({
      where: { id: targetId },
      data: { isHidden: true, hiddenAt: new Date() },
    })
  }
  return true
}
