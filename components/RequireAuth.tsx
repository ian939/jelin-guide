'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

/**
 * 비로그인 상태로 client 보호 페이지에 진입하면 자동으로 /signup 으로 redirect.
 * 메인 동선이 가입이라(첫 진입자 다수) 로그인보다 가입 페이지를 default로 보낸다.
 * 가입 또는 로그인(가입 페이지 하단 링크) 후 원래 가려던 경로(+ querystring)로 복귀.
 *
 * 사용:
 *   export default function Page(props) {
 *     return <RequireAuth><PageBody {...props} /></RequireAuth>
 *   }
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <Guard>{children}</Guard>
    </Suspense>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      const qs = params.toString()
      const target = qs ? `${pathname}?${qs}` : pathname
      router.replace(`/signup?callbackUrl=${encodeURIComponent(target)}`)
    }
  }, [status, pathname, params, router])

  if (status !== 'authenticated') return <LoadingShell />
  return <>{children}</>
}

function LoadingShell() {
  return (
    <main className="px-5 py-10">
      <p className="text-sm text-zinc-500">로그인 확인 중…</p>
    </main>
  )
}
