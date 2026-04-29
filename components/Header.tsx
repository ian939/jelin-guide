'use client'

import { useSession } from 'next-auth/react'
import Image from 'next/image'
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
          <Link href="/map" aria-label="제슐렝가이드 홈" className="flex items-center">
            <Image
              src="/logo.png"
              alt="제슐렝가이드"
              width={120}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>
        )}
        {title ? <h1 className="text-base font-semibold">{title}</h1> : null}
      </div>
      <nav className="flex items-center gap-3 text-sm text-zinc-600">
        <Link href="/ranking">랭킹</Link>
        {status === 'loading' ? null : nickname ? (
          <div ref={menuRef} className="relative flex items-center gap-2">
            <span className="font-medium text-zinc-900">{nickname}</span>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="메뉴 열기"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
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
