'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { MiniMap } from '@/components/MiniMap'
import { PlaceKeywordSearch, type SearchHit } from '@/components/PlaceKeywordSearch'
import { RequireAuth } from '@/components/RequireAuth'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MEAL_TYPES,
  MEAL_TYPE_LABEL,
  PLACE_TAGS,
  type CategoryCode,
  type MealTypeCode,
  type PlaceTag,
} from '@/lib/validators/place'

export default function EditPlacePage(props: { params: { id: string } }) {
  return (
    <RequireAuth>
      <EditPlaceForm {...props} />
    </RequireAuth>
  )
}

function EditPlaceForm({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 가게 식별 정보 (이름/주소/좌표) — 검색으로 통째로 갈아끼울 수 있음
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [searchMode, setSearchMode] = useState(false)

  // 메타
  const [category, setCategory] = useState<CategoryCode>('KOREAN')
  const [mealType, setMealType] = useState<MealTypeCode>('LUNCH')
  const [zeropaySelfReport, setZeropay] = useState(true)
  const [menuMemo, setMenuMemo] = useState('')
  const [priceMemo, setPriceMemo] = useState('')
  const [recommendReason, setRecommendReason] = useState('')
  const [tags, setTags] = useState<PlaceTag[]>([])

  useEffect(() => {
    fetch(`/api/places/${params.id}`)
      .then(r => r.json())
      .then(({ place }) => {
        if (!place) return
        setName(place.name)
        setAddress(place.address)
        setLat(place.lat)
        setLng(place.lng)
        setCategory(place.category)
        setMealType(place.mealType ?? 'LUNCH')
        setZeropay(place.zeropaySelfReport)
        setMenuMemo(place.menuMemo ?? '')
        setPriceMemo(place.priceMemo ?? '')
        setRecommendReason(place.recommendReason ?? '')
        setTags(
          (place.tags ?? []).filter((t: string) =>
            (PLACE_TAGS as readonly string[]).includes(t)
          ) as PlaceTag[]
        )
        setLoading(false)
      })
  }, [params.id])

  function applyHit(hit: SearchHit) {
    setName(hit.name)
    setAddress(hit.roadAddress || hit.jibunAddress)
    setLat(hit.lat)
    setLng(hit.lng)
    setCategory(hit.suggestedCategory)
    setSearchMode(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/places/${params.id}`, {
      method: 'PATCH',
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
        tags,
        lat,
        lng,
      }),
    })
    setSubmitting(false)
    if (res.status === 401) {
      router.replace(`/signup?callbackUrl=/places/${params.id}/edit`)
      return
    }
    if (res.status === 422) {
      const body = await res.json()
      setError(body.message ?? '주소를 다시 확인해주세요.')
      return
    }
    if (!res.ok) {
      setError('수정 중 오류가 발생했습니다.')
      return
    }
    router.replace(`/places/${params.id}?flash=edited`)
    router.refresh()
  }

  return (
    <>
      <Header title="정보 수정" back={`/places/${params.id}`} />
      <main className="px-5 py-6">
        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              위키 스타일로 누구나 수정할 수 있습니다. 모든 변경은 이력에 기록됩니다.
            </p>

            {/* 가게 식별: 카드 + "다른 가게로 변경" 버튼, 또는 검색 모드 */}
            {searchMode ? (
              <div className="space-y-3">
                <PlaceKeywordSearch onSelect={applyHit} />
                <button
                  type="button"
                  onClick={() => setSearchMode(false)}
                  className="btn-secondary"
                >
                  검색 취소
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-accent bg-accent-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-zinc-600">{address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchMode(true)}
                      className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                    >
                      다른 가게로 변경
                    </button>
                  </div>
                </div>
                {lat != null && lng != null ? (
                  <MiniMap lat={lat} lng={lng} name={name} />
                ) : null}
              </div>
            )}

            <div>
              <label>용도</label>
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
              <label htmlFor="category">카테고리</label>
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
              <label htmlFor="menuMemo">대표 메뉴</label>
              <input id="menuMemo" value={menuMemo} onChange={e => setMenuMemo(e.target.value)} />
            </div>
            <div>
              <label htmlFor="priceMemo">가격대</label>
              <input id="priceMemo" value={priceMemo} onChange={e => setPriceMemo(e.target.value)} />
            </div>
            <div>
              <label>키워드</label>
              <div className="flex flex-wrap gap-2">
                {PLACE_TAGS.map(t => {
                  const active = tags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTags(prev => (active ? prev.filter(x => x !== t) : [...prev, t]))
                      }
                      className={`chip ${active ? 'chip-active' : ''}`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label htmlFor="recommendReason">추천이유</label>
              <textarea
                id="recommendReason"
                value={recommendReason}
                onChange={e => setRecommendReason(e.target.value)}
                placeholder="이 가게를 추천하는 이유"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-zinc-500">{recommendReason.length} / 500</p>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? '저장 중…' : '저장'}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
