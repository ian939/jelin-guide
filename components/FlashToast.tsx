'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const MESSAGES: Record<string, string> = {
  registered: '🎉 추천해 주셔서 감사합니다! 동료의 다음 식사가 행복해질 거예요.',
  reviewed: '🙌 리뷰 등록 완료! 다른 분들도 참고할 수 있게 됐어요.',
  edited: '✅ 수정 사항이 반영됐어요.',
  rolledback: '↩️ 이전 버전으로 되돌렸어요.',
}

/**
 * URL 쿼리 ?flash=registered|reviewed|edited|rolledback 가 있으면
 * 페이지 상단에 잠깐 떠 있는 안내 카드를 보여주고, 3초 후 자동으로 사라지면서
 * 쿼리도 URL에서 제거한다 (history는 깨끗하게 유지).
 */
export function FlashToast() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const params = useSearchParams()
  const router = useRouter()
  const flash = params.get('flash')
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!flash) return
    const m = MESSAGES[flash]
    if (!m) return
    setMessage(m)
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 3000)
    // URL에서 flash 제거 (replace로 history 안 늘림)
    const next = new URLSearchParams(params)
    next.delete('flash')
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false })
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash])

  if (!visible || !message) return null
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 px-4">
      <div className="pointer-events-auto rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
        {message}
      </div>
    </div>
  )
}
