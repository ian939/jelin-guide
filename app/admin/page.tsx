import { prisma } from '@/lib/db'
import { AdminPlaceRow } from '@/components/AdminPlaceRow'
import { AdminReportRow } from '@/components/AdminReportRow'
import { CATEGORY_LABEL } from '@/lib/validators/place'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const pendingReports = await prisma.report.groupBy({
    by: ['targetType', 'targetId'],
    where: { resolution: 'PENDING' },
    _count: true,
    orderBy: { _count: { targetId: 'desc' } },
    take: 100,
  })

  const reviewIds = pendingReports.filter(r => r.targetType === 'REVIEW').map(r => r.targetId)
  const placeIds = pendingReports.filter(r => r.targetType === 'PLACE').map(r => r.targetId)
  const [reviews, places, deletedUsers, allPlaces] = await Promise.all([
    reviewIds.length
      ? prisma.review.findMany({
          where: { id: { in: reviewIds } },
          include: { author: { select: { nickname: true } }, place: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    placeIds.length
      ? prisma.place.findMany({
          where: { id: { in: placeIds } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 30,
      select: { id: true, nickname: true, deletedAt: true },
    }),
    prisma.place.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { nickname: true } },
        _count: { select: { reviews: true } },
      },
      take: 100,
    }),
  ])
  const reviewMap = new Map(reviews.map(r => [r.id, r]))
  const placeMap = new Map(places.map(p => [p.id, p]))

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-2 text-xl font-bold">/admin</h1>
      <p className="mb-8 text-xs text-zinc-500">
        Basic Auth 보호. 환경변수 BASIC_AUTH_USER / BASIC_AUTH_PASS.
      </p>

      <section>
        <h2 className="mb-3 font-bold">신고 대시보드 ({pendingReports.length})</h2>
        {pendingReports.length === 0 ? (
          <p className="text-sm text-zinc-500">대기 중인 신고가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {pendingReports.map(r => {
              const target =
                r.targetType === 'REVIEW' ? reviewMap.get(r.targetId) : placeMap.get(r.targetId)
              return (
                <AdminReportRow
                  key={`${r.targetType}-${r.targetId}`}
                  targetType={r.targetType}
                  targetId={r.targetId}
                  count={r._count}
                  target={target as any}
                />
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-bold">전체 가맹점 ({allPlaces.length})</h2>
        <p className="mb-3 text-xs text-zinc-500">
          삭제 시 해당 가맹점의 리뷰·수정 이력·투표가 모두 함께 삭제됩니다 (cascade). 신중히 사용.
        </p>
        {allPlaces.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 가맹점이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {allPlaces.map(p => (
              <AdminPlaceRow
                key={p.id}
                place={{
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  category: CATEGORY_LABEL[p.category],
                  isHidden: p.isHidden,
                  createdBy: p.createdBy.nickname,
                  reviewCount: p._count.reviews,
                  createdAt: p.createdAt.toISOString(),
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-bold">탈퇴 처리됨 ({deletedUsers.length})</h2>
        <ul className="text-sm">
          {deletedUsers.map(u => (
            <li key={u.id} className="flex items-center justify-between border-b border-zinc-100 py-2">
              <span>{u.nickname}</span>
              <span className="text-xs text-zinc-500">
                {u.deletedAt ? new Date(u.deletedAt).toLocaleDateString('ko-KR') : '-'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
