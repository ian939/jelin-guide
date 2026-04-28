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
  initialCenter = { lat: 37.5665, lng: 126.978 },
}: {
  markers: MapMarker[]
  onMarkerClick?: (id: string) => void
  onViewportChange?: (bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
  initialCenter?: { lat: number; lng: number }
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerObjs = useRef<any[]>([])
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
    }
    // 마커 갱신
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
          : undefined,
      })
      if (onMarkerClick)
        naver.maps.Event.addListener(marker, 'click', () => onMarkerClick(m.id))
      markerObjs.current.push(marker)
    }
  }, [ready, markers, onMarkerClick, onViewportChange, initialCenter])

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ''

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={mapRef} className="h-[60vh] w-full" />
    </>
  )
}
