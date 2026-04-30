import { z } from 'zod'

export const CATEGORIES = [
  'KOREAN',
  'WESTERN',
  'JAPANESE',
  'CHINESE',
  'SNACK',
  'CAFE',
  'BAR',
  'ETC',
] as const
export type CategoryCode = (typeof CATEGORIES)[number]

export const CATEGORY_LABEL: Record<CategoryCode, string> = {
  KOREAN: '한식',
  WESTERN: '양식',
  JAPANESE: '일식',
  CHINESE: '중식',
  SNACK: '분식',
  CAFE: '카페',
  BAR: '주점',
  ETC: '기타',
}

export const MEAL_TYPES = ['LUNCH', 'DINNER', 'OTHER'] as const
export type MealTypeCode = (typeof MEAL_TYPES)[number]
export const MEAL_TYPE_LABEL: Record<MealTypeCode, string> = {
  LUNCH: '점심',
  DINNER: '회식',
  OTHER: '기타',
}

// 추천 시 사용자가 선택할 수 있는 키워드 (multi-select).
// '네이버 500+'는 크롤링 import 스크립트가 자동 부여 — 사용자도 선택 가능.
export const PLACE_TAGS = [
  '도보 5분',
  '손님과 함께',
  '혼밥',
  '가성비',
  '분위기 좋음',
  '조용함',
  '단체 가능',
  '주차 가능',
  '네이버 500+',
] as const
export type PlaceTag = (typeof PLACE_TAGS)[number]

export const placeSubmitSchema = z.object({
  name: z.string().trim().min(1, '상호를 입력하세요.').max(80),
  address: z.string().trim().min(2, '주소를 입력하세요.').max(200),
  category: z.enum(CATEGORIES),
  mealType: z.enum(MEAL_TYPES).default('LUNCH'),
  zeropaySelfReport: z.boolean(),
  menuMemo: z.string().trim().max(120).optional().or(z.literal('')),
  priceMemo: z.string().trim().max(60).optional().or(z.literal('')),
  recommendReason: z.string().trim().max(500).optional().or(z.literal('')),
  tags: z.array(z.enum(PLACE_TAGS)).max(8).default([]),
  // 추천 시점에 본인의 첫 평점 (선택). 추천자가 곧 첫 리뷰어가 됨.
  scoreTaste: z.number().int().min(1).max(5).optional(),
  scoreValue: z.number().int().min(1).max(5).optional(),
  scoreAtmosphere: z.number().int().min(1).max(5).optional(),
  // 카카오 검색에서 받은 좌표 — 있으면 신뢰, 없으면 Geocoding fallback
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
})

export type PlaceSubmit = z.infer<typeof placeSubmitSchema>

export const placeFilterSchema = z.object({
  q: z.string().optional(),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  tags: z.array(z.enum(PLACE_TAGS)).optional(),
  crewVerified: z.coerce.boolean().optional(),
  minAvg: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['popular', 'recent', 'distance', 'review', 'rating']).optional(),
  bbox: z
    .object({
      minLat: z.number(),
      maxLat: z.number(),
      minLng: z.number(),
      maxLng: z.number(),
    })
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
})

export type PlaceFilter = z.infer<typeof placeFilterSchema>
