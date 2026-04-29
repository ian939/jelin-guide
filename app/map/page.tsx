'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { MealTypeTabs } from '@/components/MealTypeTabs'
import { NaverMap, type MapMarker } from '@/components/NaverMap'
import { Stars } from '@/components/Stars'
import { haversineMeters } from '@/lib/places'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MEAL_TYPES,
  PLACE_TAGS,
  type CategoryCode,
  type MealTypeCode,
  type PlaceTag,
} from '@/lib/validators/place'

type ListItem = {
  id: string
  name: string
  lat: number
  lng: number
  category: CategoryCode
  reviewCount: number
  avgScore: number | null
}

// SK일렉링크 본사 — 거리순 기준점
const HOME_LAT = 37.5159083
const HOME_LNG = 127.0339653

type SortKey = 'recent' | 'distance' | 'rating'
const SORT_LABEL: Record<SortKey, string> = {
  recent: '최신',
  distance: '가까운 순',
  rating: '평점 높은 순',
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const params = useSearchParams()
  const mealParam = params.get('mealType')
  const mealType: MealTypeCode = MEAL_TYPES.includes(mealParam as MealTypeCode)
    ? (mealParam as MealTypeCode)
    : 'LUNCH'

  const [items, setItems] = useState<ListItem[]>([])
  const [selected, setSelected] = useState<Set<CategoryCode>>(new Set())
  const [tagFilter, setTagFilter] = useState<Set<PlaceTag>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const qs = new URLSearchParams()
    qs.set('mealType', mealType)
    selected.forEach(c => qs.append('category', c))
    tagFilter.forEach(t => qs.append('tag', t))
    setLoading(true)
    fetch(`/api/places?${qs.toString()}&pageSize=50`, { signal: ctrl.signal })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: { places?: any[] }) => {
        const list = json.places ?? []
        setItems(
          list.map(p => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            reviewCount: p.reviewCount,
            avgScore: p.avgScore,
          }))
        )
        setLoading(false)
      })
      .catch(err => {
        // navigation/cleanup으로 abort된 fetch는 무시 — finally도 호출 안 함 (아래에서 ignore)
        if (err?.name === 'AbortError') return
        // 그 외 네트워크 실패: 빈 리스트로 폴백 (사용자 영향 최소화)
        setItems([])
        setLoading(false)
      })
    return () => ctrl.abort()
  }, [selected, tagFilter, mealType])

  // 정렬: client-side에 적용 (server는 'recent' 기본)
  const sortedItems = useMemo(() => {
    const arr = [...items]
    if (sortKey === 'distance') {
      arr.sort(
        (a, b) =>
          haversineMeters({ lat: HOME_LAT, lng: HOME_LNG }, a) -
          haversineMeters({ lat: HOME_LAT, lng: HOME_LNG }, b)
      )
    } else if (sortKey === 'rating') {
      arr.sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
    }
    return arr
  }, [items, sortKey])

  const markers: MapMarker[] = useMemo(
    () =>
      sortedItems.map(({ id, name, lat, lng, category, avgScore, reviewCount }) => ({
        id,
        name,
        lat,
        lng,
        category: CATEGORY_LABEL[category],
        avgScore,
        reviewCount,
      })),
    [sortedItems]
  )

  function toggle(c: CategoryCode) {
    const next = new Set(selected)
    next.has(c) ? next.delete(c) : next.add(c)
    setSelected(next)
  }

  function toggleTag(t: PlaceTag) {
    const next = new Set(tagFilter)
    next.has(t) ? next.delete(t) : next.add(t)
    setTagFilter(next)
  }

  return (
    <>
      <Header />
      <MealTypeTabs />
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`chip ${selected.has(c) ? 'chip-active' : ''}`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <NaverMap markers={markers} heightClass="h-[38vh]" />
      <main className="px-4 pb-24">
        <div className="my-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {loading ? '불러오는 중…' : `${sortedItems.length}곳 표시 중`}
            </p>
            <div className="flex gap-1">
              {(['recent', 'distance', 'rating'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    sortKey === k
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {SORT_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {PLACE_TAGS.map(t => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`chip shrink-0 ${tagFilter.has(t) ? 'chip-active' : ''}`}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
        <ul className="space-y-2">
          {sortedItems.map(p => (
            <li id={`item-${p.id}`} key={p.id}>
              <Link href={`/places/${p.id}`} className="card flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500">{CATEGORY_LABEL[p.category]}</p>
                </div>
                <div className="text-right">
                  <Stars value={p.avgScore} />
                  <p className="text-xs text-zinc-500">리뷰 {p.reviewCount}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Link
        href="/places/new"
        className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg"
      >
        + 맛집 추천하기
      </Link>
    </>
  )
}
