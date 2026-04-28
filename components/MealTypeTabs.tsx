'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { MEAL_TYPES, MEAL_TYPE_LABEL, type MealTypeCode } from '@/lib/validators/place'

const ICONS: Record<MealTypeCode, string> = {
  LUNCH: '🍱',
  DINNER: '🍻',
  OTHER: '✨',
}

/**
 * 점심·회식·기타 탭. URL ?mealType= 파라미터와 동기화.
 * default(LUNCH)는 호출하는 페이지에서 query 없을 때 server-side 처리.
 */
export function MealTypeTabs() {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const current = (params.get('mealType') as MealTypeCode | null) ?? 'LUNCH'

  function pick(t: MealTypeCode) {
    const next = new URLSearchParams(params)
    next.set('mealType', t)
    router.replace(`?${next.toString()}`)
  }

  return (
    <div className="grid grid-cols-3 gap-2 px-4 pt-3">
      {MEAL_TYPES.map(t => {
        const active = t === current
        return (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            className={`flex h-12 items-center justify-center gap-1 rounded-2xl text-sm font-medium transition ${
              active
                ? 'bg-accent text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <span>{ICONS[t]}</span>
            <span>{MEAL_TYPE_LABEL[t]}</span>
          </button>
        )
      })}
    </div>
  )
}
