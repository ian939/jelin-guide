import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { MiniMap } from '@/components/MiniMap'
import { Stars } from '@/components/Stars'
import { ZeropayVoteButtons } from '@/components/ZeropayVoteButtons'
import { ReportButton } from '@/components/ReportButton'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { CATEGORY_LABEL, MEAL_TYPE_LABEL } from '@/lib/validators/place'

export const dynamic = 'force-dynamic'

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  // 5개 쿼리 모두 병렬 — sequential이면 latency × 2. 가장 느린 쿼리 시간으로 수렴.
  const [place, reviews, scoreAgg, voteCounts, me] = await Promise.all([
    prisma.place.findUnique({
      where: { id: params.id },
      include: { createdBy: { select: { nickname: true } } },
    }),
    prisma.review.findMany({
      where: { placeId: params.id, isHidden: false },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { nickname: true } } },
      take: 50,
    }),
    prisma.review.aggregate({
      where: { placeId: params.id, isHidden: false },
      _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
      _count: true,
    }),
    prisma.zeropayVote.groupBy({
      by: ['isAvailable'],
      where: { placeId: params.id },
      _count: true,
    }),
    getSessionUser(),
  ])
  if (!place || place.isHidden) notFound()

  const yes = voteCounts.find(v => v.isAvailable)?._count ?? 0
  const no = voteCounts.find(v => !v.isAvailable)?._count ?? 0
  const verdict =
    yes + no === 0
      ? { label: '주장·미확인', tone: 'text-zinc-500' }
      : yes > no
      ? { label: '제로페이 사용 가능', tone: 'text-accent' }
      : yes < no
      ? { label: '사용 불가', tone: 'text-red-600' }
      : { label: '의견 갈림', tone: 'text-zinc-500' }

  const avg =
    scoreAgg._avg.scoreTaste !== null
      ? (scoreAgg._avg.scoreTaste! +
          scoreAgg._avg.scoreValue! +
          scoreAgg._avg.scoreAtmosphere!) /
        3
      : null

  const myReview = me ? reviews.find(r => r.authorId === me.id) : null

  return (
    <>
      <Header title={place.name} back="/map" />
      <main className="px-5 pb-12">
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500">
            {MEAL_TYPE_LABEL[place.mealType]} · {CATEGORY_LABEL[place.category]} · 추천 by {place.createdBy.nickname}
          </p>
          <h1 className="text-xl font-bold">{place.name}</h1>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-zinc-600">{place.address}</p>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(place.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              네이버지도 ↗
            </a>
          </div>
          <div className="mt-2">
            <MiniMap lat={place.lat} lng={place.lng} name={place.name} zoom={15} />
          </div>
          {place.menuMemo ? (
            <p className="text-sm text-zinc-600">🍴 {place.menuMemo}</p>
          ) : null}
          {place.priceMemo ? (
            <p className="text-sm text-zinc-600">💸 {place.priceMemo}</p>
          ) : null}
          {place.tags && place.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {place.tags.map(t => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
          {place.recommendReason ? (
            <div className="mt-3 rounded-xl bg-accent-soft p-3">
              <p className="text-xs font-semibold text-accent">💬 추천이유</p>
              <p className="mt-1 whitespace-pre-line text-sm text-zinc-800">{place.recommendReason}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ScoreCell label="맛" v={scoreAgg._avg.scoreTaste} />
          <ScoreCell label="가성비" v={scoreAgg._avg.scoreValue} />
          <ScoreCell label="분위기" v={scoreAgg._avg.scoreAtmosphere} />
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          평균 <Stars value={avg} /> · 리뷰 {scoreAgg._count}
        </p>

        <section className="mt-6 card">
          <p className="text-xs text-zinc-500">제로페이 (자가신고: {place.zeropaySelfReport ? '가능' : '불가'})</p>
          <p className={`mt-1 font-semibold ${verdict.tone}`}>{verdict.label}</p>
          <p className="mt-1 text-xs text-zinc-500">
            가능 {yes} · 불가 {no}
          </p>
          {me ? <ZeropayVoteButtons placeId={place.id} /> : null}
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {myReview ? (
            <Link href={`/places/${place.id}/reviews/${myReview.id}/edit`} className="btn-secondary">
              내 리뷰 수정
            </Link>
          ) : (
            <Link href={`/places/${place.id}/reviews/new`} className="btn">
              리뷰 쓰기
            </Link>
          )}
          <Link href={`/places/${place.id}/edit`} className="btn-secondary">
            정보 수정
          </Link>
        </div>
        <Link
          href={`/places/${place.id}/history`}
          className="mt-2 block text-center text-xs text-zinc-500 underline"
        >
          수정 이력 보기
        </Link>

        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold">리뷰 {scoreAgg._count}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 리뷰가 없어요. 첫 리뷰를 남겨보세요.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map(r => {
                const ravg = (r.scoreTaste + r.scoreValue + r.scoreAtmosphere) / 3
                const isMine = me?.id === r.authorId
                return (
                  <li key={r.id} className="card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.author.nickname}</span>
                      <Stars value={ravg} />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        맛 {r.scoreTaste} · 가성비 {r.scoreValue} · 분위기 {r.scoreAtmosphere}
                      </span>
                      {isMine ? (
                        <Link href={`/places/${place.id}/reviews/${r.id}/edit`} className="text-accent">
                          수정
                        </Link>
                      ) : me ? (
                        <ReportButton targetType="REVIEW" targetId={r.id} />
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}

function ScoreCell({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{v !== null ? v.toFixed(1) : '-'}</p>
    </div>
  )
}
