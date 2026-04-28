import Link from 'next/link'
import { Header } from '@/components/Header'
import { PlaceCard, type PlaceListItem } from '@/components/PlaceCard'
import { Stars } from '@/components/Stars'
import { prisma } from '@/lib/db'
import { getMonthlyJury, getProposalRanking } from '@/lib/ranking'

const BOOTSTRAP_PLACE_THRESHOLD = 5
const BOOTSTRAP_REVIEW_THRESHOLD = 10

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [placeCount, reviewCount] = await Promise.all([
    prisma.place.count({ where: { isHidden: false } }),
    prisma.review.count({ where: { isHidden: false } }),
  ])

  const isBootstrap =
    placeCount < BOOTSTRAP_PLACE_THRESHOLD || reviewCount < BOOTSTRAP_REVIEW_THRESHOLD

  return (
    <>
      <Header />
      {isBootstrap ? <BootstrapHome placeCount={placeCount} /> : <CurationHome />}
    </>
  )
}

function BootstrapHome({ placeCount }: { placeCount: number }) {
  return (
    <main className="px-5 py-10">
      <p className="mb-2 text-xs font-semibold text-accent">막 시작한 가이드</p>
      <h1 className="mb-3 text-2xl font-bold leading-tight">
        등록된 맛집 {placeCount}곳<br />
        첫 추천자가 되어보세요
      </h1>
      <p className="mb-8 text-sm text-zinc-600">
        제로페이 가맹 맛집을 동료가 직접 추천·평가하는 사내 가이드입니다.
        아직 비어있는 자리에, 좋아하는 가게를 가장 먼저 올려주세요.
      </p>
      <Link href="/places/new" className="btn">
        맛집 추천하기
      </Link>
      <Link href="/places" className="mt-3 block text-center text-sm text-zinc-500 underline">
        둘러보기
      </Link>
    </main>
  )
}

async function CurationHome() {
  const [topPlaces, jury, proposers] = await Promise.all([
    fetchTopPlaces(),
    getMonthlyJury(3),
    getProposalRanking(3),
  ])

  return (
    <main className="px-4 pb-12">
      <section className="mt-4">
        <h2 className="mb-3 px-1 text-base font-bold">🏆 평점 높은 가게</h2>
        <div className="space-y-3">
          {topPlaces.map(p => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-base font-bold">랭킹</h2>
        <div className="grid grid-cols-2 gap-3">
          <RankingCard
            title="🔥 추천 랭킹"
            empty="아직 추천 활동이 없어요."
            rows={proposers}
            unit="추천"
          />
          <RankingCard
            title="👑 심사 랭킹"
            empty="이번 달 리뷰 활동이 아직 없어요."
            rows={jury}
            unit="리뷰"
          />
        </div>
        <Link href="/ranking" className="mt-3 block text-center text-sm text-zinc-500 underline">
          전체 랭킹 보기
        </Link>
      </section>
    </main>
  )
}

function RankingCard({
  title,
  empty,
  rows,
  unit,
}: {
  title: string
  empty: string
  rows: { userId: string; nickname: string; count: number }[]
  unit: string
}) {
  return (
    <div className="card">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">{empty}</p>
      ) : (
        <ol className="space-y-2 text-xs">
          {rows.map((r, i) => (
            <li key={r.userId} className="flex items-center justify-between">
              <span className="truncate">
                <span className="mr-1 font-semibold">{i + 1}</span>
                {r.nickname}
              </span>
              <span className="shrink-0 text-zinc-500">
                {unit} {r.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

async function fetchTopPlaces(): Promise<PlaceListItem[]> {
  const places = await prisma.place.findMany({
    where: { isHidden: false },
    take: 5,
    include: { _count: { select: { reviews: { where: { isHidden: false } } } } },
    orderBy: { createdAt: 'desc' },
  })
  const aggs = await prisma.review.groupBy({
    by: ['placeId'],
    where: { placeId: { in: places.map(p => p.id) }, isHidden: false },
    _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
  })
  const aggMap = new Map(aggs.map(a => [a.placeId, a]))
  return places
    .map(p => {
      const a = aggMap.get(p.id)
      const avg =
        a && a._avg.scoreTaste !== null
          ? (a._avg.scoreTaste! + a._avg.scoreValue! + a._avg.scoreAtmosphere!) / 3
          : null
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        zeropaySelfReport: p.zeropaySelfReport,
        menuMemo: p.menuMemo,
        priceMemo: p.priceMemo,
        reviewCount: p._count.reviews,
        avgScore: avg,
      }
    })
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 5)
}
