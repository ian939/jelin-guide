import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateNicknameCandidates, signupSchema } from '@/lib/validators/user'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { nickname, password } = parsed.data

  // 동명 신접 시 자동 접미사 후보 생성: 첫 미사용 후보 채택
  const candidates = generateNicknameCandidates(nickname)
  const taken = await prisma.user.findMany({
    where: { nickname: { in: candidates } },
    select: { nickname: true },
  })
  const takenSet = new Set(taken.map(u => u.nickname))
  const finalNickname = candidates.find(c => !takenSet.has(c))
  if (!finalNickname) {
    return NextResponse.json({ error: 'NICKNAME_EXHAUSTED' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { nickname: finalNickname, passwordHash },
    select: { id: true, nickname: true, createdAt: true },
  })

  return NextResponse.json({ user }, { status: 201 })
}
