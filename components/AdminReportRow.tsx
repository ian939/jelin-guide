'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminReportRow({
  targetType,
  targetId,
  count,
  target,
}: {
  targetType: 'REVIEW' | 'PLACE'
  targetId: string
  count: number
  target: any
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function resolve(action: 'restore' | 'delete') {
    setBusy(true)
    await fetch('/api/admin/reports/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType, targetId, action }),
    })
    setBusy(false)
    router.refresh()
  }

  return (
    <li className="rounded-2xl border border-zinc-200 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
          {targetType === 'REVIEW' ? '리뷰' : '가맹점'} · 신고 {count}건
        </span>
      </div>
      {target ? (
        targetType === 'REVIEW' ? (
          <div className="mt-2">
            <p className="text-xs text-zinc-500">
              {target.author?.nickname} · 가게: {target.place?.name}
            </p>
            <p className="mt-1 line-clamp-3 text-zinc-700">{target.body}</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="font-medium">{target.name}</p>
            <p className="text-xs text-zinc-500">{target.address}</p>
          </div>
        )
      ) : (
        <p className="mt-2 text-xs text-zinc-400">대상이 이미 삭제됨</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => resolve('restore')}
          disabled={busy}
          className="rounded-xl bg-zinc-100 py-2"
        >
          복원 (숨김 해제)
        </button>
        <button
          onClick={() => resolve('delete')}
          disabled={busy}
          className="rounded-xl bg-red-50 py-2 text-red-600"
        >
          영구 삭제
        </button>
      </div>
    </li>
  )
}
