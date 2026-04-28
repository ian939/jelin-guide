// 네이버 Geocoding API 서버 프록시. 서버에서만 호출 — 클라이언트에 키 노출 금지.
//
// 응답 예시:
//   { addresses: [{ x: "127.0", y: "37.5", roadAddress: "...", jibunAddress: "..." }, ...] }
//
// 실패·빈 결과는 null 반환. 호출부에서 사용자에게 "주소를 다시 확인해주세요" 메시지로 처리.

export type GeocodeResult = { lat: number; lng: number; canonicalAddress: string }

const ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode'

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const id = process.env.NAVER_GEOCODING_CLIENT_ID
  const secret = process.env.NAVER_GEOCODING_CLIENT_SECRET
  if (!id || !secret) {
    if (process.env.NODE_ENV !== 'production') {
      // 개발 환경에선 좌표 주입을 위해 더미 값 (서울 시청)
      return { lat: 37.5665, lng: 126.978, canonicalAddress: address }
    }
    return null
  }

  const url = `${ENDPOINT}?query=${encodeURIComponent(address)}`
  const res = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': id,
      'x-ncp-apigw-api-key': secret,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { addresses?: Array<{ x: string; y: string; roadAddress?: string; jibunAddress?: string }> }
  const first = json.addresses?.[0]
  if (!first) return null
  const lat = parseFloat(first.y)
  const lng = parseFloat(first.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    lat,
    lng,
    canonicalAddress: first.roadAddress || first.jibunAddress || address,
  }
}
