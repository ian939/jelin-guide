'use client'

import { useEffect, useRef, useState } from 'react'
import type { CategoryCode } from '@/lib/validators/place'

export type SearchHit = {
  id: string
  name: string
  roadAddress: string
  jibunAddress: string
  category: string
  suggestedCategory: CategoryCode
  phone: string
  lat: number
  lng: number
  placeUrl: string
}

/**
 * 가게명으로 카카오 키워드 검색. 디바운스 후 결과 카드 리스트 표시.
 * 클릭 시 onSelect로 hit 객체 전달 — 폼이 상호·주소·좌표·카테고리를 자동 채움.
 */
export function PlaceKeywordSearch({
  onSelect,
}: {
  onSelect: (hit: SearchHit) => void
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const [authError, setAuthError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 1) {
      setHits([])
      setLoading(false)
      setAuthError(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await fetch(`/api/place-search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (res.status === 401) {
          setAuthError(true)
          setHits([])
          return
        }
        if (!res.ok) {
          setHits([])
          return
        }
        setAuthError(false)
        const { hits } = (await res.json()) as { hits: SearchHit[] }
        setHits(hits)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setHits([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  return (
    <div>
      <label htmlFor="placeQuery">가게 검색 *</label>
      <input
        id="placeQuery"
        value={q}
        onChange={e => {
          setQ(e.target.value)
          setTouched(true)
        }}
        placeholder="가게 이름으로 검색 (예: 천미향 논현직영점)"
        autoComplete="off"
      />
      <p className="mt-1 text-xs text-zinc-500">
        검색 결과에서 가게를 선택하면 상호·주소·좌표가 자동으로 채워집니다.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">검색 중…</p>
      ) : authError ? (
        <p className="mt-3 text-sm text-amber-700">
          로그인이 필요합니다. 새로고침 후 로그인해 주세요.
        </p>
      ) : hits.length === 0 ? (
        touched && q.trim().length > 0 ? (
          <p className="mt-3 text-sm text-zinc-500">검색 결과가 없어요. 가게 이름을 다시 확인해 주세요.</p>
        ) : null
      ) : (
        <ul className="mt-3 space-y-2">
          {hits.map(hit => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(hit)
                  setHits([])
                  setQ('')
                }}
                className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:bg-zinc-50"
              >
                <p className="font-medium">{hit.name}</p>
                <p className="text-xs text-zinc-500">{hit.roadAddress || hit.jibunAddress}</p>
                {hit.category ? (
                  <p className="mt-1 text-[11px] text-zinc-400">{hit.category}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
