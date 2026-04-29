'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

const CLUSTER_THRESHOLD = 50

export type MapMarker = {
  id: string
  name: string
  lat: number
  lng: number
  // optional 메타 — floating card 노출용
  avgScore?: number | null
  reviewCount?: number
  category?: string
}

export function NaverMap({
  markers,
  onMarkerClick,
  onViewportChange,
  // 기본 중심: 서울특별시 강남구 논현동 85-9 (논현로132길 43)
  initialCenter = { lat: 37.5159083, lng: 127.0339653 },
  heightClass = 'h-[42vh]',
}: {
  markers: MapMarker[]
  onMarkerClick?: (id: string) => void
  onViewportChange?: (bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
  initialCenter?: { lat: number; lng: number }
  /** Tailwind 높이 클래스. 기본 42vh — 모바일에서 적당히 보이게. */
  heightClass?: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  // id → naver Marker 캐시 (incremental upsert)
  const markerCache = useRef<Map<string, any>>(new Map())
  const skPinRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ── effect 1: 지도 init (1회만) + SK 핀
  useEffect(() => {
    if (!ready || !mapRef.current || !window.naver || mapInstance.current) return
    const naver = window.naver
    mapInstance.current = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
      zoom: 17,
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
    // 지도 빈 공간 클릭 시 floating card 닫기
    naver.maps.Event.addListener(mapInstance.current, 'click', () => {
      setSelectedId(null)
    })
  }, [ready, initialCenter.lat, initialCenter.lng, onViewportChange])

  // ── effect 2: 마커 incremental upsert (markers 변경 시)
  useEffect(() => {
    if (!ready || !mapInstance.current || !window.naver) return
    const naver = window.naver
    const tooMany = markers.length > CLUSTER_THRESHOLD
    const incoming = new Set(markers.map(m => m.id))

    // 제거: 더이상 없는 id
    for (const [id, marker] of markerCache.current.entries()) {
      if (!incoming.has(id)) {
        marker.setMap(null)
        markerCache.current.delete(id)
      }
    }

    // 추가/위치 갱신
    for (const m of markers) {
      const existing = markerCache.current.get(m.id)
      const pos = new naver.maps.LatLng(m.lat, m.lng)
      if (existing) {
        existing.setPosition(pos)
        continue
      }
      const marker = new naver.maps.Marker({
        position: pos,
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
      naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedId(m.id)
        onMarkerClick?.(m.id)
      })
      markerCache.current.set(m.id, marker)
    }
  }, [ready, markers, onMarkerClick])

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ''

  function recenter() {
    if (!mapInstance.current || !window.naver) return
    const target = new window.naver.maps.LatLng(initialCenter.lat, initialCenter.lng)
    mapInstance.current.morph(target, 17)
  }

  const selectedMarker = markers.find(m => m.id === selectedId)

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div className="relative isolate">
        <div ref={mapRef} className={`${heightClass} w-full`} />
        <button
          type="button"
          onClick={recenter}
          aria-label="SK일렉링크 위치로 돌아가기"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-md ring-1 ring-zinc-200 backdrop-blur hover:bg-white"
        >
          [SK일렉링크]
        </button>
        {selectedMarker ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
            <div className="pointer-events-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{selectedMarker.name}</p>
                  {selectedMarker.category ? (
                    <p className="text-xs text-zinc-500">{selectedMarker.category}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedMarker.avgScore != null ? (
                      <>
                        <span className="text-amber-500">★</span>{' '}
                        <span className="font-medium text-zinc-800">
                          {selectedMarker.avgScore.toFixed(1)}
                        </span>{' '}
                      </>
                    ) : (
                      <span className="text-zinc-400">평점 없음 </span>
                    )}
                    · 리뷰 {selectedMarker.reviewCount ?? 0}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="닫기"
                  className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  ✕
                </button>
              </div>
              <Link
                href={`/places/${selectedMarker.id}`}
                className="mt-3 block rounded-xl bg-accent py-2 text-center text-sm font-medium text-white"
              >
                상세 보기
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
