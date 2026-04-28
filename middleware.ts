import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// /admin 라우트만 Basic Auth로 보호. 그 외 라우트의 로그인 요구는 페이지 내 가드로 처리한다.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const auth = req.headers.get('authorization')
    const expected =
      'Basic ' +
      Buffer.from(
        `${process.env.BASIC_AUTH_USER ?? ''}:${process.env.BASIC_AUTH_PASS ?? ''}`,
        'utf8'
      ).toString('base64')
    if (!auth || auth !== expected) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
      })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
