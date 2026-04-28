import { NextResponse } from 'next/server'
import { inferCategory, searchPlaces } from '@/lib/kakao-search'
import { requireSessionUser } from '@/lib/session'

// 가게명으로 카카오 Local 검색. 로그인 사용자만 호출 가능 — REST API 키 보호.
export async function GET(req: Request) {
  const user = await requireSessionUser().catch(e => e as Response)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  if (q.trim().length < 1) {
    return NextResponse.json({ hits: [] })
  }
  const raw = await searchPlaces(q, 10)
  const hits = raw.map(h => ({
    ...h,
    suggestedCategory: inferCategory(h.category),
  }))
  return NextResponse.json({ hits })
}
