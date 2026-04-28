import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'

const bodySchema = z.object({ revisionId: z.string().min(1) })

// POST — 이 버전으로 되돌리기 (새 리비전 추가하는 형태)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const target = await prisma.placeRevision.findUnique({ where: { id: parsed.data.revisionId } })
  if (!target || target.placeId !== params.id) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const updated = await prisma.$transaction(async tx => {
    const u = await tx.place.update({
      where: { id: params.id },
      data: {
        name: target.name,
        address: target.address,
        lat: target.lat,
        lng: target.lng,
        category: target.category,
        zeropaySelfReport: target.zeropaySelfReport,
        menuMemo: target.menuMemo,
        priceMemo: target.priceMemo,
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
        zeropaySelfReport: u.zeropaySelfReport,
        menuMemo: u.menuMemo,
        priceMemo: u.priceMemo,
        editorId: user.id,
      },
    })
    return u
  })

  return NextResponse.json({ place: updated })
}
