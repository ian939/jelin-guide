'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignupPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState('/')

  useEffect(() => {
    const cb = new URLSearchParams(window.location.search).get('callbackUrl')
    if (cb) setCallbackUrl(cb)
  }, [])

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
    router.replace(callbackUrl)
    router.refresh()
  }

  return (
    <main className="px-5 py-10">
      <h1 className="mb-3 text-2xl font-bold">반가워요, 크루님 👋</h1>
      <div className="mb-8 space-y-1 text-sm leading-relaxed text-zinc-600">
        <p>학동 위키에 처음 오셨군요!</p>
        <p>닉네임이랑 비밀번호만 정해주시면, 바로 시작할 수 있어요.</p>
        <p className="text-xs text-zinc-500">(다음부턴 로그인도 필요 없답니다)</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname">닉네임 정하기</label>
          <input
            id="nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            autoComplete="username"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            2~16자 · 한글·영문·숫자·_ · 동명일 경우 <code>구아저씨_2</code>처럼 접미사가 붙어요.
          </p>
        </div>
        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            8자 이상. ⚠️ 복구 수단이 없으니 비밀번호 매니저에 저장해두세요.
          </p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn">
          {loading ? '입장 중…' : '위키 입장하기'}
        </button>
      </form>
    </main>
  )
}
