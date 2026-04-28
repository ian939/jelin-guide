'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

/**
 * 한 좌표에 마커 하나만 찍는 정적 미니맵.
 * 검색 결과로 선택한 가게의 위치를 사용자가 시각적으로 확인하는 용도.
 * - 드래그·스크롤·확대 비활성 (단순 위치 표시)
 * - NaverMap 컴포넌트와 동일한 SDK 사용 — Next.js Script가 dedupe.
 */
export function MiniMap({
  lat,
  lng,
  name,
  zoom = 16,
}: {
  lat: number
  lng: number
  name: string
  zoom?: number
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready || !mapRef.current || !window.naver) return
    const naver = window.naver
    const center = new naver.maps.LatLng(lat, lng)

    if (!mapInstance.current) {
      mapInstance.current = new naver.maps.Map(mapRef.current, {
        center,
        zoom,
        draggable: false,
        pinchZoom: false,
        scrollWheel: false,
        keyboardShortcuts: false,
        disableDoubleClickZoom: true,
        disableDoubleTapZoom: true,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
        zoomControl: false,
      })
    } else {
      mapInstance.current.setCenter(center)
    }

    if (markerRef.current) markerRef.current.setMap(null)
    markerRef.current = new naver.maps.Marker({
      position: center,
      map: mapInstance.current,
      title: name,
      icon: {
        content: `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            background: #ffffff;
            border: 2px solid #1F6BFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            line-height: 1;
            box-shadow: 0 4px 10px rgba(31,107,255,0.3), 0 1px 3px rgba(0,0,0,0.15);
          ">🍴</div>
        `,
        anchor: new naver.maps.Point(18, 18),
      },
    })
  }, [ready, lat, lng, name, zoom])

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ''

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div
        ref={mapRef}
        className="h-44 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
      />
    </>
  )
}
