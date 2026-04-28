import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { geocodeAddress } from '@/lib/geocode'
import { requireSessionUser } from '@/lib/session'
import { placeSubmitSchema } from '@/lib/validators/place'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { nickname: true } } },
  })
  if (!place || place.isHidden) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const [scoreAgg, voteCounts] = await Promise.all([
    prisma.review.aggregate({
      where: { placeId: place.id, isHidden: false },
      _avg: { scoreTaste: true, scoreValue: true, scoreAtmosphere: true },
      _count: true,
    }),
    prisma.zeropayVote.groupBy({
      by: ['isAvailable'],
      where: { placeId: place.id },
      _count: true,
    }),
  ])

  const yes = voteCounts.find(v => v.isAvailable)?._count ?? 0
  const no = voteCounts.find(v => !v.isAvailable)?._count ?? 0

  return NextResponse.json({
    place,
    scoreAvg: scoreAgg._avg,
    reviewCount: scoreAgg._count,
    zeropayVotes: { yes, no },
  })
}

// PATCH = 위키식 수정. 임의 사용자가 수정 가능. 새 PlaceRevision 추가 + Place 활성 필드 갱신.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = placeSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  // 주소가 바뀌었으면 Geocoding 재호출, 아니면 좌표 유지.
  let lat = place.lat
  let lng = place.lng
  let canonicalAddress = data.address
  if (data.address.trim() !== place.address.trim()) {
    const geo = await geocodeAddress(data.address)
    if (!geo) {
      return NextResponse.json({ error: 'GEOCODE_FAILED', message: '주소를 다시 확인해주세요.' }, { status: 422 })
    }
    lat = geo.lat
    lng = geo.lng
    canonicalAddress = geo.canonicalAddress
  }

  const updated = await prisma.$transaction(async tx => {
    const u = await tx.place.update({
      where: { id: place.id },
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
      },
    })
    await tx.placeRevision.create({
      data: {
        placeId: u.id,
        name: u.name,
        address: u.address,
        lat: u.lat,
        lng: u.lng,
        category: u.category,
        mealType: u.mealType,
        zeropaySelfReport: u.zeropaySelfReport,
        menuMemo: u.menuMemo,
        priceMemo: u.priceMemo,
        recommendReason: u.recommendReason,
        editorId: user.id,
      },
    })
    return u
  })

  return NextResponse.json({ place: updated })
}
