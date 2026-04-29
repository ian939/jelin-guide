'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'onboarding_v1_seen'

/**
 * 첫 방문자에게 환영 + 사용 안내를 보여주는 2페이지 온보딩.
 * localStorage에 dismiss 상태 저장 — 한 번 보면 다시 안 뜸.
 * 콘텐츠 변경 시 STORAGE_KEY를 v2로 올리면 모든 사용자에게 다시 노출됨.
 */
export function OnboardingDialog() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = window.localStorage.getItem(STORAGE_KEY)
    if (!seen) setOpen(true)
  }, [])

  function close() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-mobile rounded-3xl bg-white p-6 pb-5 shadow-2xl">
        {page === 0 ? <Page1 /> : <Page2 />}

        <div className="mt-5 flex justify-center gap-1.5">
          {[0, 1].map(i => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? 'w-6 bg-accent' : 'w-1.5 bg-zinc-200'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {page === 0 ? (
            <>
              <button type="button" onClick={close} className="btn-secondary">
                건너뛰기
              </button>
              <button type="button" onClick={() => setPage(1)} className="btn">
                다음
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setPage(0)} className="btn-secondary">
                이전
              </button>
              <button type="button" onClick={close} className="btn">
                시작하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Page1() {
  return (
    <div>
      <h2 className="text-lg font-bold leading-tight">
        학동 Wiki에 오신 걸 환영해요 👋
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700">
        <p>
          학동 신규 사옥으로 이전한 우리 크루들이 더 편하게 지낼 수 있도록 만들어 본 작고
          소중한 지도 서비스입니다.
        </p>
        <p>
          제로페이가 되는 맛집은 물론, 회식 장소부터 헤어샵·치과·병원까지 학동 라이프에 필요한
          모든 정보를 함께!!! 모아가고자 합니다.
        </p>
        <p>
          그래서 이름도 <strong>학동wiki</strong>, 줄여서 <strong>학키!</strong>로 정했습니다.
        </p>
        <p className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">
          아직은 MVP 버전이라 채워갈 내용도 수정할 부분도 많을 수 있어요. 오른쪽 상단 메뉴 →{' '}
          <strong>💡 제안하기</strong>로 언제든 의견 보내주세요. 함께 만들어가는 학동 위키, 많은
          참여 부탁드려요!
        </p>
      </div>
    </div>
  )
}

function Page2() {
  return (
    <div>
      <h2 className="text-lg font-bold leading-tight">📲 앱처럼 편하게 쓰기</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700">
        <p>좀 더 쉽게 사용하시려면 홈 화면에 추가하시는 걸 추천드려요.</p>
        <ol className="space-y-2">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              1
            </span>
            <span>
              우측 상단 <strong>메뉴(≡)</strong>를 누르세요.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              2
            </span>
            <span>
              <strong>📲 홈 화면에 추가</strong>를 눌러주세요.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              3
            </span>
            <span>
              안내에 따라 추가하면 <strong>앱처럼 한 번 탭으로</strong> 들어올 수 있어요!
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}
