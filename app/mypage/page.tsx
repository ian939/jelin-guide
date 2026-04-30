import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { LogoutButton } from '@/components/LogoutButton'
import { Stars } from '@/components/Stars'
import { prisma } from '@/lib/db'
import { getMyRanks } from '@/lib/ranking'
import { getSessionUser } from '@/lib/session'
import { CATEGORY_LABEL } from '@/lib/validators/place'

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const me = await getSessionUser()
  if (!me) redirect('/signup?callbackUrl=/mypage')

  const [places, reviews, ranks] = await Promise.all([
    prisma.place.findMany({
      where: { createdById: me.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.review.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: 'desc' },
      include: { place: { select: { id: true, name: true } } },
      take: 30,
    }),
    getMyRanks(me.id),
  ])

  return (
    <>
      <Header title="마이페이지" />
      <main className="px-5 pb-12">
        <section className="mt-6">
          <h2 className="text-xl font-bold">{me.nickname} 님</h2>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-2">
          <RankCell label="추천" rank={ranks.proposal} />
          <RankCell label="이달 검증" rank={ranks.monthly} />
          <RankCell label="명예의 전당" rank={ranks.hall} />
        </section>

        <section className="mt-8">
          <h3 className="mb-3 text-base font-bold">내가 추천한 맛집 ({places.length})</h3>
          {places.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 추천한 맛집이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {places.map(p => (
                <li key={p.id}>
                  <Link href={`/places/${p.id}`} className="card flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-zinc-500">{CATEGORY_LABEL[p.category]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h3 className="mb-3 text-base font-bold">내가 쓴 리뷰 ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 리뷰가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {reviews.map(r => {
                const avg = (r.scoreTaste + r.scoreValue + r.scoreAtmosphere) / 3
                return (
                  <li key={r.id}>
                    <Link
                      href={`/places/${r.place.id}/reviews/${r.id}/edit`}
                      className="card block text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.place.name}</span>
                        <Stars value={avg} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-zinc-600">{r.body}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h3 className="mb-3 text-base font-bold">설정</h3>
          <div className="space-y-2">
            <Link href="/mypage/account" className="btn-secondary">
              계정 설정 (닉네임·비밀번호·탈퇴)
            </Link>
            <LogoutButton />
          </div>
        </section>
      </main>
    </>
  )
}

function RankCell({ label, rank }: { label: string; rank: number | null }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{rank ? `${rank}위` : '-'}</p>
    </div>
  )
}
