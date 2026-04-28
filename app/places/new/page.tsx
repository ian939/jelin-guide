'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Header } from '@/components/Header'
import { MiniMap } from '@/components/MiniMap'
import { PlaceKeywordSearch, type SearchHit } from '@/components/PlaceKeywordSearch'
import { RequireAuth } from '@/components/RequireAuth'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MEAL_TYPES,
  MEAL_TYPE_LABEL,
  type CategoryCode,
  type MealTypeCode,
} from '@/lib/validators/place'

export default function NewPlacePage() {
  return (
    <RequireAuth>
      <NewPlaceForm />
    </RequireAuth>
  )
}

function NewPlaceForm() {
  const router = useRouter()
  // 검색 결과로 채워지는 핵심 필드
  const [picked, setPicked] = useState<SearchHit | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [category, setCategory] = useState<CategoryCode>('KOREAN')
  const [mealType, setMealType] = useState<MealTypeCode>('LUNCH')
  const [zeropaySelfReport, setZeropay] = useState(true)
  const [menuMemo, setMenuMemo] = useState('')
  const [priceMemo, setPriceMemo] = useState('')
  const [recommendReason, setRecommendReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function applyHit(hit: SearchHit) {
    setPicked(hit)
    setName(hit.name)
    setAddress(hit.roadAddress || hit.jibunAddress)
    setLat(hit.lat)
    setLng(hit.lng)
    setCategory(hit.suggestedCategory)
    setError(null)
  }

  function reset() {
    setPicked(null)
    setName('')
    setAddress('')
    setLat(null)
    setLng(null)
    setMenuMemo('')
    setPriceMemo('')
    setRecommendReason('')
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!picked && (!name || !address)) {
      setError('가게를 검색해서 선택해주세요.')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        address,
        category,
        mealType,
        zeropaySelfReport,
        menuMemo,
        priceMemo,
        recommendReason,
        lat,
        lng,
      }),
    })
    setLoading(false)
    if (res.status === 401) {
      router.replace('/login?callbackUrl=/places/new')
      return
    }
    if (res.status === 409) {
      const body = await res.json()
      if (body.error === 'DUPLICATE_PLACE' && body.placeId) {
        router.replace(`/places/${body.placeId}?flash=registered`)
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
          {!picked ? (
            <PlaceKeywordSearch onSelect={applyHit} />
          ) : (
            <div className="rounded-2xl border border-accent bg-accent-soft p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{picked.name}</p>
                  <p className="text-xs text-zinc-600">{picked.roadAddress || picked.jibunAddress}</p>
                  {picked.category ? (
                    <p className="mt-1 text-[11px] text-zinc-500">{picked.category}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                >
                  다시 검색
                </button>
              </div>
            </div>
          )}

          {picked ? (
            <>
              {lat != null && lng != null ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">위치 확인</p>
                  <MiniMap lat={lat} lng={lng} name={picked.name} />
                  <p className="mt-1 text-xs text-zinc-500">
                    위치가 다르면 위 카드의 <strong>다시 검색</strong>으로 다른 결과를 골라주세요.
                  </p>
                </div>
              ) : null}
              <div>
                <label>용도 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {MEAL_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMealType(t)}
                      className={`h-11 rounded-xl text-sm font-medium transition ${
                        mealType === t
                          ? 'bg-accent text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {MEAL_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
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
                <p className="mt-1 text-xs text-zinc-500">검색 결과에서 자동 추천된 카테고리. 필요시 수정.</p>
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
            </>
          ) : null}
        </form>
      </main>
    </>
  )
}
