// Kakao Local 키워드 검색 서버 프록시.
// 가게명으로 검색 → place_name·road_address_name·category_name·좌표(x=lng, y=lat)·전화번호.
// REST API 키는 서버 전용 — 클라이언트에 노출 금지.

export type KakaoSearchHit = {
  id: string
  name: string
  roadAddress: string
  jibunAddress: string
  category: string // 카카오 원본 카테고리 ("음식점 > 한식 > ...") — 우리 enum 매핑은 클라이언트에서
  phone: string
  lat: number
  lng: number
  placeUrl: string
}

const ENDPOINT = 'https://dapi.kakao.com/v2/local/search/keyword.json'

export async function searchPlaces(query: string, size = 10): Promise<KakaoSearchHit[]> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) return []
  const trimmed = query.trim()
  if (trimmed.length < 1) return []

  const url = `${ENDPOINT}?query=${encodeURIComponent(trimmed)}&size=${Math.min(15, Math.max(1, size))}`
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = (await res.json()) as {
    documents?: Array<{
      id: string
      place_name: string
      road_address_name: string
      address_name: string
      category_name: string
      phone: string
      x: string
      y: string
      place_url: string
    }>
  }
  return (json.documents ?? []).map(d => ({
    id: d.id,
    name: d.place_name,
    roadAddress: d.road_address_name || '',
    jibunAddress: d.address_name || '',
    category: d.category_name || '',
    phone: d.phone || '',
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    placeUrl: d.place_url || '',
  }))
}

/**
 * 카카오 카테고리 문자열 ("음식점 > 한식 > 김치찌개")을 우리 Category enum으로 매핑.
 */
export function inferCategory(kakaoCategory: string): 'KOREAN' | 'WESTERN' | 'JAPANESE' | 'CHINESE' | 'SNACK' | 'CAFE' | 'BAR' | 'ETC' {
  const c = kakaoCategory
  if (c.includes('카페') || c.includes('커피') || c.includes('디저트') || c.includes('베이커리')) return 'CAFE'
  if (c.includes('주점') || c.includes('호프') || c.includes('포차') || c.includes('와인') || c.includes('칵테일')) return 'BAR'
  if (c.includes('일식') || c.includes('초밥') || c.includes('라멘') || c.includes('돈까스')) return 'JAPANESE'
  if (c.includes('중식') || c.includes('중국')) return 'CHINESE'
  if (c.includes('양식') || c.includes('이탈') || c.includes('파스타') || c.includes('피자') || c.includes('스테이크') || c.includes('햄버거')) return 'WESTERN'
  if (c.includes('분식') || c.includes('떡볶이') || c.includes('김밥')) return 'SNACK'
  if (c.includes('한식') || c.includes('국밥') || c.includes('찌개') || c.includes('백반') || c.includes('돼지') || c.includes('소고기') || c.includes('치킨')) return 'KOREAN'
  return 'ETC'
}
