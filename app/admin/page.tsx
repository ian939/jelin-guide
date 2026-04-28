import { prisma } from '@/lib/db'
import { AdminReportRow } from '@/components/AdminReportRow'

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
  const [reviews, places, deletedUsers] = await Promise.all([
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
