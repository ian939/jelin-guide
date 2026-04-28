import { NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'
import { requireSessionUser } from '@/lib/session'

// 클라이언트가 폼에서 미리 좌표를 확인하고 싶을 때 사용. 로그인 사용자만 호출 가능.
export async function GET(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const q = url.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'MISSING_Q' }, { status: 400 })
  const result = await geocodeAddress(q)
  if (!result) return NextResponse.json({ error: 'GEOCODE_FAILED' }, { status: 422 })
  return NextResponse.json(result)
}
