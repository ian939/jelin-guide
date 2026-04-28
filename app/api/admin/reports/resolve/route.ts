import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// /api/admin/* 는 middleware의 Basic Auth로 보호됨.

const bodySchema = z.object({
  targetType: z.enum(['REVIEW', 'PLACE']),
  targetId: z.string().min(1),
  action: z.enum(['restore', 'delete']),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  const { targetType, targetId, action } = parsed.data

  if (action === 'restore') {
    if (targetType === 'REVIEW') {
      await prisma.review.update({ where: { id: targetId }, data: { isHidden: false, hiddenAt: null } })
    } else {
      await prisma.place.update({ where: { id: targetId }, data: { isHidden: false, hiddenAt: null } })
    }
    await prisma.report.updateMany({
      where: { targetType, targetId, resolution: 'PENDING' },
      data: { resolution: 'RESTORED', resolvedAt: new Date() },
    })
  } else {
    if (targetType === 'REVIEW') {
      await prisma.review.delete({ where: { id: targetId } })
    } else {
      // 가맹점 영구 삭제는 위험 — 우선 isHidden 유지하고 신고만 종결.
      // 필요시 운영자가 별도 경로로 삭제.
    }
    await prisma.report.updateMany({
      where: { targetType, targetId, resolution: 'PENDING' },
      data: { resolution: 'DELETED', resolvedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
