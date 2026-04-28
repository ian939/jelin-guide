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

export const placeSubmitSchema = z.object({
  name: z.string().trim().min(1, '상호를 입력하세요.').max(80),
  address: z.string().trim().min(2, '주소를 입력하세요.').max(200),
  category: z.enum(CATEGORIES),
  zeropaySelfReport: z.boolean(),
  menuMemo: z.string().trim().max(120).optional().or(z.literal('')),
  priceMemo: z.string().trim().max(60).optional().or(z.literal('')),
  recommendReason: z.string().trim().max(500).optional().or(z.literal('')),
})

export type PlaceSubmit = z.infer<typeof placeSubmitSchema>

export const placeFilterSchema = z.object({
  q: z.string().optional(),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  minAvg: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['popular', 'recent', 'distance']).optional(),
  bbox: z
    .object({
      minLat: z.number(),
      maxLat: z.number(),
      minLng: z.number(),
      maxLng: z.number(),
    })
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
})

export type PlaceFilter = z.infer<typeof placeFilterSchema>
