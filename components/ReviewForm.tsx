'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { StarSelect } from '@/components/Stars'

export function ReviewForm({
  placeId,
  reviewId,
  initial,
}: {
  placeId: string
  reviewId?: string
  initial?: { scoreTaste: number; scoreValue: number; scoreAtmosphere: number; body: string }
}) {
  const router = useRouter()
  const [taste, setTaste] = useState(initial?.scoreTaste ?? 4)
  const [value, setValue] = useState(initial?.scoreValue ?? 4)
  const [atmos, setAtmos] = useState(initial?.scoreAtmosphere ?? 4)
  const [body, setBody] = useState(initial?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const url = reviewId ? `/api/reviews/${reviewId}` : `/api/places/${placeId}/reviews`
    const method = reviewId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scoreTaste: taste,
        scoreValue: value,
        scoreAtmosphere: atmos,
        body,
      }),
    })
    setBusy(false)
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=/places/${placeId}`)
      return
    }
    if (res.status === 409) {
      setError('이미 작성한 리뷰가 있어요.')
      return
    }
    if (!res.ok) {
      const r = await res.json().catch(() => ({}))
      setError(
        r.issues?.fieldErrors
          ? Object.values(r.issues.fieldErrors).flat().join(' ')
          : '리뷰 저장 중 오류가 발생했습니다.'
      )
      return
    }
    router.replace(`/places/${placeId}`)
    router.refresh()
  }

  async function onDelete() {
    if (!reviewId) return
    if (!confirm('리뷰를 삭제할까요?')) return
    setBusy(true)
    const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      router.replace(`/places/${placeId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="card space-y-3">
        <StarSelect label="맛" value={taste} onChange={setTaste} />
        <StarSelect label="가성비" value={value} onChange={setValue} />
        <StarSelect label="분위기" value={atmos} onChange={setAtmos} />
      </div>
      <div>
        <label htmlFor="body">한마디 (10~1000자)</label>
        <textarea
          id="body"
          value={body}
          onChange={e => setBody(e.target.value)}
          minLength={10}
          maxLength={1000}
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn">
        {busy ? '저장 중…' : reviewId ? '리뷰 수정' : '리뷰 등록'}
      </button>
      {reviewId ? (
        <button type="button" onClick={onDelete} disabled={busy} className="btn-secondary">
          리뷰 삭제
        </button>
      ) : null}
    </form>
  )
}
