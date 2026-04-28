'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(
        body.issues?.fieldErrors
          ? Object.values(body.issues.fieldErrors).flat().join(' ')
          : '가입 중 오류가 발생했습니다.'
      )
      setLoading(false)
      return
    }
    const { user } = await res.json()
    // 가입 성공 → 자동 로그인
    await signIn('credentials', {
      nickname: user.nickname,
      password,
      redirect: false,
    })
    setLoading(false)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="px-5 py-10">
      <h1 className="mb-2 text-2xl font-bold">가입하기</h1>
      <p className="mb-8 text-sm text-zinc-500">
        ⚠️ 비밀번호 복구 수단이 없습니다. 자주 쓰는 기기의 브라우저·비밀번호 매니저에 저장해두세요.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname">닉네임 (2~16자, 한글·영문·숫자·_)</label>
          <input
            id="nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            autoComplete="username"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            동명이 있을 경우 자동 접미사가 붙습니다 (예: <code>구아저씨_2</code>).
          </p>
        </div>
        <div>
          <label htmlFor="password">비밀번호 (8자 이상)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn">
          {loading ? '가입 중…' : '가입하고 시작하기'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-accent">
          로그인
        </Link>
      </p>
    </main>
  )
}
