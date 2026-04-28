'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AddressSearchInput } from '@/components/AddressSearchInput'
import { Header } from '@/components/Header'
import { RequireAuth } from '@/components/RequireAuth'
import { CATEGORIES, CATEGORY_LABEL, type CategoryCode } from '@/lib/validators/place'

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
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState<CategoryCode>('KOREAN')
  const [zeropaySelfReport, setZeropay] = useState(true)
  const [menuMemo, setMenuMemo] = useState('')
  const [priceMemo, setPriceMemo] = useState('')

  useEffect(() => {
    fetch(`/api/places/${params.id}`)
      .then(r => r.json())
      .then(({ place }) => {
        if (!place) return
        setName(place.name)
        setAddress(place.address)
        setCategory(place.category)
        setZeropay(place.zeropaySelfReport)
        setMenuMemo(place.menuMemo ?? '')
        setPriceMemo(place.priceMemo ?? '')
        setLoading(false)
      })
  }, [params.id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/places/${params.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, address, category, zeropaySelfReport, menuMemo, priceMemo }),
    })
    setSubmitting(false)
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=/places/${params.id}/edit`)
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
    router.replace(`/places/${params.id}`)
    router.refresh()
  }

  return (
    <>
      <Header title="가맹점 정보 수정" back={`/places/${params.id}`} />
      <main className="px-5 py-6">
        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              위키 스타일로 누구나 수정할 수 있습니다. 모든 변경은 이력에 기록됩니다.
            </p>
            <div>
              <label htmlFor="name">상호 *</label>
              <input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="address">주소 *</label>
              <AddressSearchInput id="address" value={address} onChange={setAddress} required />
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
