import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import { reviewSubmitSchema } from '@/lib/validators/review'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const review = await prisma.review.findUnique({ where: { id: params.id } })
  if (!review) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (review.authorId !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = reviewSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: parsed.data,
  })
  return NextResponse.json({ review: updated })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const review = await prisma.review.findUnique({ where: { id: params.id } })
  if (!review) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (review.authorId !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  await prisma.review.delete({ where: { id: review.id } })
  return NextResponse.json({ ok: true })
}
