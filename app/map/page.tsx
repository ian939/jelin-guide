'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { MealTypeTabs } from '@/components/MealTypeTabs'
import { NaverMap, type MapMarker } from '@/components/NaverMap'
import { Stars } from '@/components/Stars'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MEAL_TYPES,
  type CategoryCode,
  type MealTypeCode,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('mealType', mealType)
    selected.forEach(c => qs.append('category', c))
    setLoading(true)
    fetch(`/api/places?${qs.toString()}&pageSize=50`)
      .then(r => r.json())
      .then(({ places }) => {
        setItems(
          places.map((p: any) => ({
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
  }, [selected, mealType])

  const markers: MapMarker[] = useMemo(
    () =>
      items.map(({ id, name, lat, lng, category, avgScore, reviewCount }) => ({
        id,
        name,
        lat,
        lng,
        category: CATEGORY_LABEL[category],
        avgScore,
        reviewCount,
      })),
    [items]
  )

  function toggle(c: CategoryCode) {
    const next = new Set(selected)
    next.has(c) ? next.delete(c) : next.add(c)
    setSelected(next)
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
        <p className="my-3 text-xs text-zinc-500">
          {loading ? '불러오는 중…' : `${items.length}곳 표시 중 · 마커 50개 이상은 작은 점으로 표시`}
        </p>
        <ul className="space-y-2">
          {items.map(p => (
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
