import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { geocodeAddress } from '@/lib/geocode'
import { findDuplicatePlace } from '@/lib/places'
import { requireSessionUser } from '@/lib/session'
import { placeFilterSchema, placeSubmitSchema } from '@/lib/validators/place'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const rawCategories = url.searchParams.getAll('category')
  const parsed = placeFilterSchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    categories: rawCategories.length ? rawCategories : undefined,
    mealType: url.searchParams.get('mealType') ?? undefined,
    minAvg: url.searchParams.get('minAvg') ?? undefined,
    minReviews: url.searchParams.get('minReviews') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }
  const { q, categories, mealType, minAvg, minReviews, sort, page = 1, pageSize = 20 } = parsed.data

  const where: Prisma.PlaceWhereInput = { isHidden: false }
  if (categories?.length) where.category = { in: categories }
  if (mealType) where.mealType = mealType
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { menuMemo: { contains: q, mode: 'insensitive' } },
    ]
  }

  const places = await prisma.place.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: sort === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    include: {
      _count: { select: { reviews: { where: { isHidden: false } } } },
    },
  })

  // 평점 평균은 별도 aggregate (1쿼리로 묶어 처리)
  const reviewAggs = await prisma.review.groupBy({
    by: ['placeId'],
    where: { placeId: { in: places.map(p => p.id) }, isHidden: false },
    _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
  })
  const aggMap = new Map(reviewAggs.map(a => [a.placeId, a]))

  let enriched = places.map(p => {
    const agg = aggMap.get(p.id)
    const avg =
      agg && agg._avg.scoreTaste !== null
        ? ((agg._avg.scoreTaste! + agg._avg.scoreValue! + agg._avg.scoreAtmosphere!) / 3)
        : null
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      mealType: p.mealType,
      zeropaySelfReport: p.zeropaySelfReport,
      menuMemo: p.menuMemo,
      priceMemo: p.priceMemo,
      reviewCount: p._count.reviews,
      avgScore: avg,
    }
  })

  if (typeof minAvg === 'number') enriched = enriched.filter(p => (p.avgScore ?? 0) >= minAvg)
  if (typeof minReviews === 'number') enriched = enriched.filter(p => p.reviewCount >= minReviews)
  if (sort === 'popular') {
    enriched.sort((a, b) => (b.reviewCount - a.reviewCount) || ((b.avgScore ?? 0) - (a.avgScore ?? 0)))
  } else if (sort === 'review') {
    enriched.sort((a, b) => b.reviewCount - a.reviewCount)
  } else if (sort === 'rating') {
    enriched.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
  }

  return NextResponse.json({ places: enriched, page, pageSize })
}

export async function POST(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = placeSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  // 카카오 검색에서 받은 좌표가 있으면 신뢰, 없으면 Geocoding으로 fallback.
  let lat: number
  let lng: number
  let canonicalAddress = data.address
  if (data.lat != null && data.lng != null) {
    lat = data.lat
    lng = data.lng
  } else {
    const geo = await geocodeAddress(data.address)
    if (!geo) {
      return NextResponse.json(
        { error: 'GEOCODE_FAILED', message: '주소를 다시 확인해주세요.' },
        { status: 422 }
      )
    }
    lat = geo.lat
    lng = geo.lng
    canonicalAddress = geo.canonicalAddress
  }

  const dup = await findDuplicatePlace({ name: data.name, lat, lng })
  if (dup) {
    return NextResponse.json(
      { error: 'DUPLICATE_PLACE', message: '이미 등록된 가게입니다. 리뷰로 가시겠어요?', placeId: dup.id },
      { status: 409 }
    )
  }

  const place = await prisma.$transaction(async tx => {
    const created = await tx.place.create({
      data: {
        name: data.name,
        address: canonicalAddress,
        lat,
        lng,
        category: data.category,
        mealType: data.mealType,
        zeropaySelfReport: data.zeropaySelfReport,
        menuMemo: data.menuMemo || null,
        priceMemo: data.priceMemo || null,
        recommendReason: data.recommendReason || null,
        tags: data.tags ?? [],
        createdById: user.id,
      },
    })
    await tx.placeRevision.create({
      data: {
        placeId: created.id,
        name: created.name,
        address: created.address,
        lat: created.lat,
        lng: created.lng,
        category: created.category,
        mealType: created.mealType,
        zeropaySelfReport: created.zeropaySelfReport,
        menuMemo: created.menuMemo,
        priceMemo: created.priceMemo,
        recommendReason: created.recommendReason,
        tags: created.tags,
        editorId: user.id,
      },
    })
    // 추천자 본인의 첫 평점이 같이 들어오면 첫 Review로 등록.
    if (
      data.scoreTaste != null &&
      data.scoreValue != null &&
      data.scoreAtmosphere != null
    ) {
      const body =
        (data.recommendReason && data.recommendReason.trim().length >= 10)
          ? data.recommendReason
          : `${data.name}을(를) 동료에게 추천합니다.`
      await tx.review.create({
        data: {
          placeId: created.id,
          authorId: user.id,
          scoreTaste: data.scoreTaste,
          scoreValue: data.scoreValue,
          scoreAtmosphere: data.scoreAtmosphere,
          body,
        },
      })
    }
    return created
  })

  return NextResponse.json({ place }, { status: 201 })
}
