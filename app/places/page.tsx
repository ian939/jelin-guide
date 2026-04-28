import Link from 'next/link'
import { Header } from '@/components/Header'
import { MealTypeTabs } from '@/components/MealTypeTabs'
import { PlaceCard, type PlaceListItem } from '@/components/PlaceCard'
import { PlaceFilters } from '@/components/PlaceFilters'
import { prisma } from '@/lib/db'
import { CATEGORIES, MEAL_TYPES, type CategoryCode, type MealTypeCode } from '@/lib/validators/place'

type SP = { [k: string]: string | string[] | undefined }

export const dynamic = 'force-dynamic'

export default async function PlacesPage({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q as string | undefined) ?? undefined
  const cats = ([] as string[])
    .concat(searchParams.category ?? [])
    .filter(c => CATEGORIES.includes(c as CategoryCode)) as CategoryCode[]
  const minAvg = searchParams.minAvg ? Number(searchParams.minAvg) : undefined
  const minReviews = searchParams.minReviews ? Number(searchParams.minReviews) : undefined
  const sort = (searchParams.sort as string | undefined) ?? 'recent'
  const mealParam = searchParams.mealType as string | undefined
  const mealType: MealTypeCode = MEAL_TYPES.includes(mealParam as MealTypeCode)
    ? (mealParam as MealTypeCode)
    : 'LUNCH'

  const where: any = { isHidden: false, mealType }
  if (cats.length) where.category = { in: cats }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { menuMemo: { contains: q, mode: 'insensitive' } },
    ]
  }

  const places = await prisma.place.findMany({
    where,
    take: 30,
    orderBy: sort === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    include: { _count: { select: { reviews: { where: { isHidden: false } } } } },
  })
  const aggs = await prisma.review.groupBy({
    by: ['placeId'],
    where: { placeId: { in: places.map(p => p.id) }, isHidden: false },
    _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
  })
  const aggMap = new Map(aggs.map(a => [a.placeId, a]))
  let items: PlaceListItem[] = places.map(p => {
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
  if (typeof minAvg === 'number') items = items.filter(p => (p.avgScore ?? 0) >= minAvg)
  if (typeof minReviews === 'number') items = items.filter(p => p.reviewCount >= minReviews)
  if (sort === 'popular') {
    items.sort((a, b) => (b.reviewCount - a.reviewCount) || ((b.avgScore ?? 0) - (a.avgScore ?? 0)))
  } else if (sort === 'review') {
    items.sort((a, b) => b.reviewCount - a.reviewCount)
  } else if (sort === 'rating') {
    items.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
  }

  return (
    <>
      <Header />
      <MealTypeTabs />
      <PlaceFilters />
      <main className="px-4 pb-24">
        {items.length === 0 ? (
          <p className="px-1 py-12 text-center text-sm text-zinc-500">
            조건에 맞는 가맹점이 없어요.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map(p => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        )}
      </main>
      <Link
        href="/places/new"
        className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg"
      >
        + 맛집 추천하기
      </Link>
    </>
  )
}
