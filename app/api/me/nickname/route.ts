import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import {
  changeNicknameSuffixSchema,
  generateNicknameCandidates,
} from '@/lib/validators/user'

export async function POST(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user
  const body = await req.json().catch(() => null)
  const parsed = changeNicknameSuffixSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }
  const candidates = generateNicknameCandidates(parsed.data.baseNickname)
  const taken = await prisma.user.findMany({
    where: { nickname: { in: candidates }, NOT: { id: user.id } },
    select: { nickname: true },
  })
  const takenSet = new Set(taken.map(u => u.nickname))
  const finalNickname = candidates.find(c => !takenSet.has(c))
  if (!finalNickname) return NextResponse.json({ error: 'NICKNAME_EXHAUSTED' }, { status: 409 })
  await prisma.user.update({ where: { id: user.id }, data: { nickname: finalNickname } })
  return NextResponse.json({ nickname: finalNickname })
}
