import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { maybeAutoHide } from '@/lib/reports'
import { requireSessionUser } from '@/lib/session'
import { reportSubmitSchema } from '@/lib/validators/report'

export async function POST(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = reportSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  }
  const { targetType, targetId, reason } = parsed.data

  // 대상 존재 검증
  if (targetType === 'REVIEW') {
    const r = await prisma.review.findUnique({ where: { id: targetId }, select: { id: true } })
    if (!r) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  } else {
    const p = await prisma.place.findUnique({ where: { id: targetId }, select: { id: true } })
    if (!p) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    await prisma.report.create({
      data: { targetType, targetId, reporterId: user.id, reason: reason ?? null },
    })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'ALREADY_REPORTED' }, { status: 409 })
    }
    throw e
  }

  const hidden = await maybeAutoHide(targetType, targetId)
  return NextResponse.json({ ok: true, hidden })
}
