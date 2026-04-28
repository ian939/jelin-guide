import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { RollbackButton } from '@/components/RollbackButton'
import { prisma } from '@/lib/db'
import { CATEGORY_LABEL } from '@/lib/validators/place'

export const dynamic = 'force-dynamic'

export default async function HistoryPage({ params }: { params: { id: string } }) {
  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place) notFound()
  const revisions = await prisma.placeRevision.findMany({
    where: { placeId: place.id },
    orderBy: { createdAt: 'desc' },
    include: { editor: { select: { nickname: true } } },
    take: 50,
  })

  return (
    <>
      <Header title="수정 이력" back={`/places/${place.id}`} />
      <main className="px-4 pb-12">
        <ul className="mt-3 space-y-3">
          {revisions.map((r, i) => (
            <li key={r.id} className="card text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {new Date(r.createdAt).toLocaleString('ko-KR')} · {r.editor.nickname}
                </span>
                {i === 0 ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                    현재
                  </span>
                ) : (
                  <RollbackButton placeId={place.id} revisionId={r.id} />
                )}
              </div>
              <p className="mt-2 font-semibold">{r.name}</p>
              <p className="text-zinc-600">{r.address}</p>
              <p className="text-xs text-zinc-500">
                {CATEGORY_LABEL[r.category]} · 제로페이{' '}
                {r.zeropaySelfReport ? '가능' : '불가'}
              </p>
              {r.menuMemo ? <p className="text-xs text-zinc-500">메뉴: {r.menuMemo}</p> : null}
              {r.priceMemo ? <p className="text-xs text-zinc-500">가격대: {r.priceMemo}</p> : null}
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
