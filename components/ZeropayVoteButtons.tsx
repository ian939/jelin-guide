'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ZeropayVoteButtons({ placeId }: { placeId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<'yes' | 'no' | null>(null)
  async function vote(isAvailable: boolean) {
    setPending(isAvailable ? 'yes' : 'no')
    const res = await fetch(`/api/places/${placeId}/votes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isAvailable }),
    })
    setPending(null)
    if (res.ok) router.refresh()
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button onClick={() => vote(true)} disabled={pending !== null} className="btn-secondary">
        {pending === 'yes' ? '⋯' : '👍 사용 가능'}
      </button>
      <button onClick={() => vote(false)} disabled={pending !== null} className="btn-secondary">
        {pending === 'no' ? '⋯' : '👎 사용 불가'}
      </button>
    </div>
  )
}
