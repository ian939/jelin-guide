import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'

// GET — 수정 이력 (최신순)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const revisions = await prisma.placeRevision.findMany({
    where: { placeId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { editor: { select: { nickname: true } } },
    take: 50,
  })
  return NextResponse.json({ revisions })
}
