import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// /api/admin/* 는 middleware의 Basic Auth로 보호됨.
// Place는 onDelete: Cascade가 PlaceRevision/Review/ZeropayVote에 걸려 있어
// 자동으로 함께 삭제된다. Report는 cascade가 없으므로 별도로 PENDING 정리.

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const place = await prisma.place.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!place) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  await prisma.$transaction([
    prisma.report.updateMany({
      where: { targetType: 'PLACE', targetId: place.id, resolution: 'PENDING' },
      data: { resolution: 'DELETED', resolvedAt: new Date() },
    }),
    prisma.place.delete({ where: { id: place.id } }),
  ])

  return NextResponse.json({ ok: true })
}
