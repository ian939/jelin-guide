'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CATEGORIES, CATEGORY_LABEL, type CategoryCode } from '@/lib/validators/place'

export function PlaceFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const selected = new Set(params.getAll('category') as CategoryCode[])
  const minAvg = params.get('minAvg') ?? ''
  const minReviews = params.get('minReviews') ?? ''
  const sort = params.get('sort') ?? 'recent'
  const [open, setOpen] = useState(false)

  function toggleCategory(c: CategoryCode) {
    const next = new URLSearchParams(params)
    next.delete('category')
    const newSet = new Set(selected)
    if (newSet.has(c)) newSet.delete(c)
    else newSet.add(c)
    newSet.forEach(v => next.append('category', v))
    router.replace(`?${next.toString()}`)
  }

  function applyAdvanced(form: FormData) {
    const next = new URLSearchParams(params)
    const ma = form.get('minAvg')?.toString() ?? ''
    const mr = form.get('minReviews')?.toString() ?? ''
    const so = form.get('sort')?.toString() ?? ''
    if (ma) next.set('minAvg', ma)
    else next.delete('minAvg')
    if (mr) next.set('minReviews', mr)
    else next.delete('minReviews')
    if (so) next.set('sort', so)
    else next.delete('sort')
    router.replace(`?${next.toString()}`)
    setOpen(false)
  }

  return (
    <div className="sticky top-14 z-20 bg-white">
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => toggleCategory(c)}
            className={`chip ${selected.has(c) ? 'chip-active' : ''}`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
        <button onClick={() => setOpen(true)} className="chip">
          ⋯ 필터
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/40">
          <form
            action={applyAdvanced}
            className="w-full rounded-t-3xl bg-white p-5 pb-8 max-w-mobile mx-auto"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-zinc-200" />
            <h2 className="mb-4 text-lg font-bold">필터</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="minAvg">최소 평균 평점</label>
                <select id="minAvg" name="minAvg" defaultValue={minAvg}>
                  <option value="">제한 없음</option>
                  <option value="4.0">4.0 이상</option>
                  <option value="4.5">4.5 이상</option>
                </select>
              </div>
              <div>
                <label htmlFor="minReviews">최소 리뷰 수</label>
                <select id="minReviews" name="minReviews" defaultValue={minReviews}>
                  <option value="">제한 없음</option>
                  <option value="1">1+</option>
                  <option value="5">5+</option>
                  <option value="10">10+</option>
                </select>
              </div>
              <div>
                <label htmlFor="sort">정렬</label>
                <select id="sort" name="sort" defaultValue={sort}>
                  <option value="recent">최신순</option>
                  <option value="popular">인기순 (리뷰+평점 가중)</option>
                  <option value="review">리뷰 많은 순</option>
                  <option value="rating">평점 높은 순</option>
                </select>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                닫기
              </button>
              <button type="submit" className="btn">
                적용
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
