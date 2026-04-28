'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export function Header({ title, back }: { title?: string; back?: string }) {
  const { data: session, status } = useSession()
  const nickname = session?.user?.nickname ?? null
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/90 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {back ? (
          <Link href={back} aria-label="뒤로" className="-ml-2 px-2 py-1 text-zinc-500">
            ←
          </Link>
        ) : (
          <Link href="/" className="text-base font-bold text-zinc-900">
            제슐렝가이드
          </Link>
        )}
        {title ? <h1 className="text-base font-semibold">{title}</h1> : null}
      </div>
      <nav className="flex items-center gap-3 text-sm text-zinc-600">
        <Link href="/map">지도</Link>
        <Link href="/ranking">랭킹</Link>
        {status === 'loading' ? null : nickname ? (
          <Link href="/mypage" className="font-medium text-zinc-900">
            {nickname}
          </Link>
        ) : (
          <Link href="/login" className="font-medium text-accent">
            로그인
          </Link>
        )}
      </nav>
    </header>
  )
}
