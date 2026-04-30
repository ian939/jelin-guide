import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { recomputePlaceAggregates } from '@/lib/place-aggregates'
import { requireSessionUser } from '@/lib/session'
import { voteSubmitSchema } from '@/lib/validators/report'

// POST — 제로페이 사용 가능/불가 투표 (1인 1표, 변경 가능)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = voteSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const place = await prisma.place.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!place) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const vote = await prisma.$transaction(async tx => {
    const v = await tx.zeropayVote.upsert({
      where: { placeId_voterId: { placeId: place.id, voterId: user.id } },
      create: {
        placeId: place.id,
        voterId: user.id,
        isAvailable: parsed.data.isAvailable,
      },
      update: { isAvailable: parsed.data.isAvailable },
    })
    await recomputePlaceAggregates(place.id, tx)
    return v
  })

  return NextResponse.json({ vote })
}
