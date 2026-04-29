'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export function Header({ title, back }: { title?: string; back?: string }) {
  const { data: session, status } = useSession()
  const nickname = session?.user?.nickname ?? null
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/90 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {back ? (
          <Link href={back} aria-label="뒤로" className="-ml-2 px-2 py-1 text-zinc-500">
            ←
          </Link>
        ) : (
          <Link href="/map" className="text-base font-bold text-zinc-900">
            제슐렝가이드
          </Link>
        )}
        {title ? <h1 className="text-base font-semibold">{title}</h1> : null}
      </div>
      <nav className="flex items-center gap-3 text-sm text-zinc-600">
        <Link href="/ranking">랭킹</Link>
        {status === 'loading' ? null : nickname ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-1 font-medium text-zinc-900"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {nickname}
              <span aria-hidden className="text-base leading-none">≡</span>
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
              >
                <Link
                  href="/mypage"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  내 활동
                </Link>
                <Link
                  href="/mypage/account"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  프로필 설정
                </Link>
                <Link
                  href="/updates"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  업데이트 내역
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="font-medium text-accent">
            로그인
          </Link>
        )}
      </nav>
    </header>
  )
}
