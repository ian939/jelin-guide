'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminPlaceRow({
  place,
}: {
  place: {
    id: string
    name: string
    address: string
    category: string
    isHidden: boolean
    createdBy: string
    reviewCount: number
    createdAt: string
  }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    if (
      !confirm(
        `정말 "${place.name}" 가맹점을 영구 삭제할까요?\n` +
          `이 가게의 리뷰 ${place.reviewCount}건, 수정 이력, 투표가 모두 함께 삭제됩니다.`
      )
    )
      return
    setBusy(true)
    const res = await fetch(`/api/admin/places/${place.id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) router.refresh()
    else alert('삭제 중 오류가 발생했습니다.')
  }

  return (
    <li className="rounded-2xl border border-zinc-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {place.name}
            {place.isHidden ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                숨김
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-zinc-500">{place.address}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {place.category} · 추천 by {place.createdBy} · 리뷰 {place.reviewCount}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={busy}
          className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          {busy ? '⋯' : '삭제'}
        </button>
      </div>
    </li>
  )
}
