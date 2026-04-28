'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Header } from '@/components/Header'

export default function AccountPage() {
  const router = useRouter()
  const [baseNickname, setBase] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function changeNickname() {
    setMsg(null)
    const res = await fetch('/api/me/nickname', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ baseNickname }),
    })
    if (res.ok) {
      const { nickname } = await res.json()
      setMsg(`닉네임이 ${nickname}으로 바뀌었어요.`)
      router.refresh()
    } else {
      setMsg('변경 실패')
    }
  }
  async function changePassword() {
    setMsg(null)
    const res = await fetch('/api/me/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ current, next }),
    })
    if (res.ok) {
      setMsg('비밀번호가 바뀌었어요.')
      setCurrent('')
      setNext('')
    } else {
      setMsg('변경 실패')
    }
  }
  async function deleteAccount() {
    if (!confirm('정말 탈퇴하시겠어요? 작성한 제안·리뷰는 닉네임 그대로 잔존합니다.')) return
    const res = await fetch('/api/me/delete', { method: 'POST' })
    if (res.ok) {
      await signOut({ callbackUrl: '/' })
    }
  }

  return (
    <>
      <Header title="계정 설정" back="/mypage" />
      <main className="space-y-8 px-5 py-6">
        <section>
          <h3 className="mb-3 text-sm font-bold">닉네임 변경 (접미사 자동 회피)</h3>
          <div className="space-y-2">
            <input
              value={baseNickname}
              onChange={e => setBase(e.target.value)}
              placeholder="새 닉네임 (2~16자)"
            />
            <button onClick={changeNickname} className="btn">
              닉네임 변경
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold">비밀번호 변경</h3>
          <div className="space-y-2">
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              autoComplete="new-password"
            />
            <button onClick={changePassword} className="btn">
              비밀번호 변경
            </button>
          </div>
        </section>

        {msg ? <p className="text-sm text-accent">{msg}</p> : null}

        <section>
          <h3 className="mb-3 text-sm font-bold text-red-600">탈퇴</h3>
          <p className="mb-3 text-xs text-zinc-500">
            계정만 사라지고, 작성한 제안과 리뷰는 원 닉네임 그대로 잔존합니다.
            비밀번호 복구 수단이 없으므로 다시 들어올 수는 없습니다.
          </p>
          <button onClick={deleteAccount} className="btn-secondary text-red-600">
            탈퇴하기
          </button>
        </section>
      </main>
    </>
  )
}
