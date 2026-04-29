'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  PROPOSAL_CATEGORIES,
  PROPOSAL_CATEGORY_LABEL,
  type ProposalCategory,
} from '@/lib/validators/proposal'

/**
 * 제안하기 모달. controlled 컴포넌트 — open/onClose는 외부에서 관리.
 * 보내기 → /api/proposals → Apps Script webhook → ?flash=proposed.
 */
export function ProposalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<ProposalCategory>('FEATURE')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    if (busy) return
    onClose()
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
    onClose()
    setTitle('')
    setBody('')
    setCategory('FEATURE')
    router.replace(`${window.location.pathname}?flash=proposed`)
  }

  if (!open) return null

  return (
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
          이 서비스는 MVP 버전입니다 — UI/기능/버그/기타 어떤 의견이든 환영해요. 다음
          업데이트에 반영하겠습니다.
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
  )
}
