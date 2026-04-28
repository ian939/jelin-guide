import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import { reviewSubmitSchema } from '@/lib/validators/review'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const reviews = await prisma.review.findMany({
    where: { placeId: params.id, isHidden: false },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { nickname: true } } },
    take: 50,
  })
  return NextResponse.json({ reviews })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = reviewSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }

  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place || place.isHidden) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    const review = await prisma.review.create({
      data: {
        placeId: place.id,
        authorId: user.id,
        scoreTaste: parsed.data.scoreTaste,
        scoreValue: parsed.data.scoreValue,
        scoreAtmosphere: parsed.data.scoreAtmosphere,
        body: parsed.data.body,
      },
    })
    return NextResponse.json({ review }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'ALREADY_REVIEWED', message: '이미 리뷰를 작성했습니다. 수정으로 가시겠어요?' },
        { status: 409 }
      )
    }
    throw e
  }
}
