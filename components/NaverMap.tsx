'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

const CLUSTER_THRESHOLD = 50

export type MapMarker = {
  id: string
  name: string
  lat: number
  lng: number
}

export function NaverMap({
  markers,
  onMarkerClick,
  onViewportChange,
  // 기본 중심: 서울특별시 강남구 논현동 85-9 (논현로132길 43)
  initialCenter = { lat: 37.5159083, lng: 127.0339653 },
}: {
  markers: MapMarker[]
  onMarkerClick?: (id: string) => void
  onViewportChange?: (bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
  initialCenter?: { lat: number; lng: number }
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerObjs = useRef<any[]>([])
  const skPinRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready || !mapRef.current || !window.naver) return
    const naver = window.naver
    if (!mapInstance.current) {
      mapInstance.current = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
        zoom: 14,
      })
      if (onViewportChange) {
        const handler = () => {
          const b = mapInstance.current.getBounds()
          onViewportChange({
            minLat: b.getMin().y,
            maxLat: b.getMax().y,
            minLng: b.getMin().x,
            maxLng: b.getMax().x,
          })
        }
        naver.maps.Event.addListener(mapInstance.current, 'idle', handler)
      }
      // SK일렉링크 본사 핀 — 그라데이션 동그라미 + "SK" 글자, 일반 마커와 구분되어 항상 노출
      skPinRef.current = new naver.maps.Marker({
        position: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
        map: mapInstance.current,
        title: 'SK일렉링크',
        zIndex: 1000,
        icon: {
          content: `
            <div style="
              width: 42px;
              height: 42px;
              border-radius: 9999px;
              background: linear-gradient(135deg, #EA002C 0%, #FF6F00 100%);
              color: #fff;
              font-weight: 800;
              font-size: 14px;
              letter-spacing: 0.3px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #fff;
              box-shadow: 0 6px 16px rgba(234, 0, 44, 0.35), 0 2px 6px rgba(0,0,0,0.2);
              font-family: 'Pretendard Variable', Pretendard, system-ui, sans-serif;
            ">SK</div>
          `,
          anchor: new naver.maps.Point(21, 21),
        },
      })
    }
    // 마커 갱신 — 식당 모양(흰 원 + 포크/나이프 이모지). 50개 이상 시 작은 점으로.
    for (const m of markerObjs.current) m.setMap(null)
    markerObjs.current = []
    const tooMany = markers.length > CLUSTER_THRESHOLD
    for (const m of markers) {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(m.lat, m.lng),
        map: mapInstance.current,
        title: m.name,
        icon: tooMany
          ? {
              content:
                '<div style="width:10px;height:10px;border-radius:9999px;background:#1F6BFF;opacity:.85"></div>',
              anchor: new naver.maps.Point(5, 5),
            }
          : {
              content: `
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 9999px;
                  background: #ffffff;
                  border: 2px solid #1F6BFF;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  line-height: 1;
                  box-shadow: 0 3px 8px rgba(31, 107, 255, 0.25), 0 1px 3px rgba(0,0,0,0.15);
                  cursor: pointer;
                ">🍴</div>
              `,
              anchor: new naver.maps.Point(16, 16),
            },
      })
      if (onMarkerClick)
        naver.maps.Event.addListener(marker, 'click', () => onMarkerClick(m.id))
      markerObjs.current.push(marker)
    }
  }, [ready, markers, onMarkerClick, onViewportChange, initialCenter])

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ''

  function recenter() {
    if (!mapInstance.current || !window.naver) return
    const target = new window.naver.maps.LatLng(initialCenter.lat, initialCenter.lng)
    mapInstance.current.morph(target, 14)
  }

  return (
    <>
      <Script
        // 신규 NCP 계정은 ncpKeyId 파라미터를 쓴다 (구 ncpClientId 는 deprecated)
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div className="relative">
        <div ref={mapRef} className="h-[60vh] w-full" />
        <button
          type="button"
          onClick={recenter}
          aria-label="SK일렉링크 위치로 돌아가기"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-md ring-1 ring-zinc-200 backdrop-blur hover:bg-white"
        >
          [SK일렉링크]
        </button>
      </div>
    </>
  )
}
