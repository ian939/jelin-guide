import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'

// 탈퇴 — 계정만 비활성화. 제안·리뷰·투표는 잔존, 닉네임도 그대로.
// 세션은 NextAuth callbacks에서 deletedAt 검사로 즉시 무효화한다.
export async function POST() {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } }),
  ])
  return NextResponse.json({ ok: true })
}
