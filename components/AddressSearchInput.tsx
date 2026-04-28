'use client'

import Script from 'next/script'
import { useState } from 'react'

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: { oncomplete: (data: PostcodeData) => void }) => { open: () => void }
    }
  }
}

type PostcodeData = {
  roadAddress?: string
  jibunAddress?: string
  buildingName?: string
  zonecode?: string
}

/**
 * Daum 우편번호 서비스(카카오) 래퍼.
 * - 키 발급 불필요, CDN에서 바로 로드, 무료
 * - 검색 후 도로명/지번주소를 input에 자동 입력
 * - 사용자가 그 뒤에 동·호수 등 상세주소 직접 추가 가능
 */
export function AddressSearchInput({
  id,
  value,
  onChange,
  required,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const [ready, setReady] = useState(false)

  function openSearch() {
    if (!ready || !window.daum) {
      alert('주소 검색을 불러오는 중입니다. 잠시 후 다시 눌러주세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete: data => {
        const main = data.roadAddress || data.jibunAddress || ''
        const withBuilding = data.buildingName ? `${main} (${data.buildingName})` : main
        onChange(withBuilding)
      },
    }).open()
  }

  return (
    <>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <button
        type="button"
        onClick={openSearch}
        className="mb-2 inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        🔍 주소 검색
      </button>
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="검색해서 선택하거나, 동/호수 등 상세주소를 추가"
        required={required}
      />
      <p className="mt-1 text-xs text-zinc-500">
        검색 결과 뒤에 동·호수 등 상세주소를 자유롭게 덧붙이실 수 있어요.
      </p>
    </>
  )
}
