'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  PROPOSAL_CATEGORIES,
  PROPOSAL_CATEGORY_LABEL,
  type ProposalCategory,
} from '@/lib/validators/proposal'

/**
 * 우측 하단 floating "💡 제안하기" 버튼.
 * 클릭 시 모달 — 제목/내용/카테고리 + MVP 안내 메시지.
 * 보내기 → /api/proposals → Google Sheets webhook.
 */
export function ProposalFab() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<ProposalCategory>('FEATURE')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    if (busy) return
    setOpen(false)
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, body, category }),
    })
    setBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.message ?? '의견 전송 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
      return
    }
    setOpen(false)
    setTitle('')
    setBody('')
    setCategory('FEATURE')
    // FlashToast 활용 — 현재 URL에 ?flash 파라미터를 붙이는 패턴이지만
    // 메시지가 다르므로 직접 alert 대신 alert 1회 (간단)
    router.replace(`${window.location.pathname}?flash=proposed`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="제안하기"
        className="fixed bottom-6 right-5 z-30 flex h-12 items-center justify-center gap-1 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800"
      >
        💡 제안하기
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/40"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submit}
            onClick={e => e.stopPropagation()}
            className="mx-auto w-full max-w-mobile rounded-t-3xl bg-white p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-zinc-200" />
            <h2 className="mb-1 text-lg font-bold">💡 의견 보내기</h2>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              이 서비스는 MVP 버전입니다 — UI/기능/버그/기타 어떤 의견이든 환영해요.
              다음 업데이트에 반영하겠습니다.
            </p>

            <div className="space-y-3">
              <div>
                <label>분류</label>
                <div className="grid grid-cols-4 gap-2">
                  {PROPOSAL_CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`h-10 rounded-xl text-sm font-medium transition ${
                        category === c
                          ? 'bg-accent text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {PROPOSAL_CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="prop-title">제목 *</label>
                <input
                  id="prop-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="짧은 한 줄"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor="prop-body">내용 *</label>
                <textarea
                  id="prop-body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="자세한 내용을 적어주세요"
                  maxLength={2000}
                  required
                />
                <p className="mt-1 text-xs text-zinc-500">{body.length} / 2000</p>
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={close} disabled={busy} className="btn-secondary">
                닫기
              </button>
              <button type="submit" disabled={busy} className="btn">
                {busy ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
