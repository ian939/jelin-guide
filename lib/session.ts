import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    nickname: session.user.nickname ?? '익명',
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })
  }
  return user
}
