'use client'

import { useState } from 'react'

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'REVIEW' | 'PLACE'
  targetId: string
}) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  async function report() {
    if (!confirm('이 항목을 신고할까요?')) return
    setBusy(true)
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType, targetId }),
    })
    setBusy(false)
    if (res.ok) {
      setDone(true)
    } else if (res.status === 409) {
      setDone(true)
    } else {
      alert('신고 처리 중 오류가 발생했습니다.')
    }
  }
  if (done) return <span className="text-zinc-400">신고 접수됨</span>
  return (
    <button onClick={report} disabled={busy} className="text-zinc-400 hover:text-red-500">
      신고
    </button>
  )
}
