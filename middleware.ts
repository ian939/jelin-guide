import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /login 진입은 즉시 /signup 으로 보낸다 (callbackUrl 등 query 그대로 유지).
  // server component의 redirect()는 Netlify edge cache hit 가능성이 있어 middleware로
  // 가드해 매 요청에 신선한 307을 내보낸다.
  if (pathname === '/login') {
    const url = req.nextUrl.clone()
    url.pathname = '/signup'
    return NextResponse.redirect(url, 307)
  }

  // /admin 라우트만 Basic Auth로 보호. 그 외 라우트의 로그인 요구는 페이지 내 가드로 처리한다.
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
  matcher: ['/login', '/admin/:path*', '/api/admin/:path*'],
}
