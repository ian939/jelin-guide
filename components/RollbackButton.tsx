'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RollbackButton({ placeId, revisionId }: { placeId: string; revisionId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function rollback() {
    if (!confirm('이 버전으로 되돌릴까요?')) return
    setBusy(true)
    const res = await fetch(`/api/places/${placeId}/rollback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revisionId }),
    })
    setBusy(false)
    if (res.status === 401) {
      router.replace(`/signup?callbackUrl=/places/${placeId}/history`)
      return
    }
    if (res.ok) {
      router.replace(`/places/${placeId}?flash=rolledback`)
      router.refresh()
    }
  }
  return (
    <button onClick={rollback} disabled={busy} className="text-xs text-accent">
      {busy ? '⋯' : '이 버전으로 되돌리기'}
    </button>
  )
}
