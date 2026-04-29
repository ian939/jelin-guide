'use client'

import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { InstallDialog } from '@/components/InstallDialog'
import { ProposalDialog } from '@/components/ProposalDialog'
import { MEAL_TYPES, MEAL_TYPE_LABEL, type MealTypeCode } from '@/lib/validators/place'

const MEAL_ICONS: Record<MealTypeCode, string> = {
  LUNCH: '🍱',
  DINNER: '🍻',
  OTHER: '✨',
}

export function Header({
  title,
  back,
  showMealType = false,
}: {
  title?: string
  back?: string
  /** /map 처럼 점심·회식·기타 탭이 의미 있는 페이지에서 true. */
  showMealType?: boolean
}) {
  const { data: session, status } = useSession()
  const nickname = session?.user?.nickname ?? null
  const [menuOpen, setMenuOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
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
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-100 bg-white/90 px-3 backdrop-blur">
        {/* 좌: 로고 또는 뒤로 + (선택) 페이지 타이틀 */}
        <div className="flex shrink-0 items-center gap-2">
          {back ? (
            <Link href={back} aria-label="뒤로" className="-ml-1 px-1 py-1 text-zinc-500">
              ←
            </Link>
          ) : (
            <Link href="/map" aria-label="제슐렝가이드 홈" className="flex items-center">
              <Image
                src="/logo.png"
                alt="제슐렝가이드"
                width={84}
                height={28}
                priority
                className="h-7 w-auto"
              />
            </Link>
          )}
          {title ? <h1 className="truncate text-sm font-semibold">{title}</h1> : null}
        </div>

        {/* 가운데: mealType 탭 (해당 페이지에서만) */}
        <div className="flex flex-1 justify-center">
          {showMealType ? <HeaderMealTabs /> : null}
        </div>

        {/* 우: 닉네임 + 햄버거 */}
        <div ref={menuRef} className="relative flex shrink-0 items-center gap-1">
          {status === 'loading' ? null : nickname ? (
            <>
              <span className="hidden text-xs font-medium text-zinc-900 sm:inline">
                {nickname}
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="메뉴 열기"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100"
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
                  className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
                >
                  {nickname ? (
                    <p className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500 sm:hidden">
                      {nickname}
                    </p>
                  ) : null}
                  <Link
                    href="/mypage"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    내 활동
                  </Link>
                  <Link
                    href="/ranking"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    🏆 랭킹
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
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setInstallOpen(true)
                    }}
                    className="block w-full border-t border-zinc-100 px-4 py-3 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    📲 홈 화면에 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setProposalOpen(true)
                    }}
                    className="block w-full border-t border-zinc-100 px-4 py-3 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    💡 제안하기
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium text-accent">
              로그인
            </Link>
          )}
        </div>
      </header>

      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} />
      <ProposalDialog open={proposalOpen} onClose={() => setProposalOpen(false)} />
    </>
  )
}

function HeaderMealTabs() {
  return (
    <Suspense fallback={null}>
      <HeaderMealTabsInner />
    </Suspense>
  )
}

function HeaderMealTabsInner() {
  const router = useRouter()
  const params = useSearchParams()
  const current = (params.get('mealType') as MealTypeCode | null) ?? 'LUNCH'

  function pick(t: MealTypeCode) {
    const next = new URLSearchParams(params)
    next.set('mealType', t)
    router.replace(`?${next.toString()}`)
  }

  return (
    <div className="flex gap-1 rounded-full bg-zinc-100 p-0.5">
      {MEAL_TYPES.map(t => {
        const active = t === current
        return (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            className={`flex h-8 items-center justify-center gap-0.5 rounded-full px-2.5 text-xs font-medium transition ${
              active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
            }`}
          >
            <span aria-hidden>{MEAL_ICONS[t]}</span>
            <span>{MEAL_TYPE_LABEL[t]}</span>
          </button>
        )
      })}
    </div>
  )
}
