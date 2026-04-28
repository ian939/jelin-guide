'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

export default function LoginPage() {
  // Next.js 14 정적 export에서 useSearchParams를 쓰는 컴포넌트는 Suspense boundary가 필요
  return (
    <Suspense fallback={<main className="px-5 py-10"><p className="text-sm text-zinc-500">로딩 중…</p></main>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/'
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', {
      nickname,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('닉네임 또는 비밀번호가 일치하지 않습니다.')
      return
    }
    router.replace(callbackUrl)
    router.refresh()
  }

  return (
    <main className="px-5 py-10">
      <h1 className="mb-8 text-2xl font-bold">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn">
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-accent">
          가입하기
        </Link>
      </p>
    </main>
  )
}
