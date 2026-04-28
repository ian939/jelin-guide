'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AddressSearchInput } from '@/components/AddressSearchInput'
import { Header } from '@/components/Header'
import { RequireAuth } from '@/components/RequireAuth'
import { CATEGORIES, CATEGORY_LABEL, type CategoryCode } from '@/lib/validators/place'

export default function NewPlacePage() {
  return (
    <RequireAuth>
      <NewPlaceForm />
    </RequireAuth>
  )
}

function NewPlaceForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState<CategoryCode>('KOREAN')
  const [zeropaySelfReport, setZeropay] = useState(true)
  const [menuMemo, setMenuMemo] = useState('')
  const [priceMemo, setPriceMemo] = useState('')
  const [recommendReason, setRecommendReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, address, category, zeropaySelfReport, menuMemo, priceMemo, recommendReason }),
    })
    setLoading(false)
    if (res.status === 401) {
      router.replace('/login?callbackUrl=/places/new')
      return
    }
    if (res.status === 409) {
      const body = await res.json()
      if (body.error === 'DUPLICATE_PLACE' && body.placeId) {
        // 이미 등록된 가게 → 기존 상세로 자동 이동 (배너로 사후 안내)
        router.replace(`/places/${body.placeId}?duplicateNotice=1`)
        return
      }
      setError(body.message ?? '이미 등록된 가게입니다.')
      return
    }
    if (res.status === 422) {
      const body = await res.json()
      setError(body.message ?? '주소를 다시 확인해주세요.')
      return
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(
        body.issues?.fieldErrors
          ? Object.values(body.issues.fieldErrors).flat().join(' ')
          : '추천 등록 중 오류가 발생했습니다.'
      )
      return
    }
    const { place } = await res.json()
    router.replace(`/places/${place.id}?flash=registered`)
  }

  return (
    <>
      <Header title="맛집 추천하기" back="/places" />
      <main className="px-5 py-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name">상호 *</label>
            <input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="address">주소 *</label>
            <AddressSearchInput id="address" value={address} onChange={setAddress} required />
          </div>
          <div>
            <label htmlFor="category">카테고리 *</label>
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value as CategoryCode)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
            <input
              type="checkbox"
              checked={zeropaySelfReport}
              onChange={e => setZeropay(e.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            <span className="text-sm">제로페이 사용 가능 (자가신고)</span>
          </label>
          <div>
            <label htmlFor="menuMemo">대표 메뉴 (선택)</label>
            <input
              id="menuMemo"
              value={menuMemo}
              onChange={e => setMenuMemo(e.target.value)}
              placeholder="예: 김치찌개·계란말이"
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="priceMemo">가격대 (선택)</label>
            <input
              id="priceMemo"
              value={priceMemo}
              onChange={e => setPriceMemo(e.target.value)}
              placeholder="예: 1만원대"
              maxLength={60}
            />
          </div>
          <div>
            <label htmlFor="recommendReason">추천이유 (선택)</label>
            <textarea
              id="recommendReason"
              value={recommendReason}
              onChange={e => setRecommendReason(e.target.value)}
              placeholder="이 가게를 추천하는 이유를 적어주세요. 동료에게 도움이 됩니다."
              maxLength={500}
            />
            <p className="mt-1 text-xs text-zinc-500">{recommendReason.length} / 500</p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn">
            {loading ? '등록 중…' : '추천하기'}
          </button>
        </form>
      </main>
    </>
  )
}
