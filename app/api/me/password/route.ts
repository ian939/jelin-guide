import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import { changePasswordSchema } from '@/lib/validators/user'

export async function POST(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user
  const body = await req.json().catch(() => null)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.flatten() }, { status: 400 })
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const ok = await bcrypt.compare(parsed.data.current, dbUser.passwordHash)
  if (!ok) return NextResponse.json({ error: 'WRONG_PASSWORD' }, { status: 403 })
  const next = await bcrypt.hash(parsed.data.next, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: next } })
  return NextResponse.json({ ok: true })
}
