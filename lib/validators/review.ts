import { z } from 'zod'

const score = z.number().int().min(1).max(5)

export const reviewSubmitSchema = z.object({
  scoreTaste: score,
  scoreValue: score,
  scoreAtmosphere: score,
  body: z
    .string()
    .trim()
    .min(10, '리뷰 본문은 10자 이상이어야 합니다.')
    .max(1000, '리뷰는 1000자까지 입력할 수 있습니다.'),
})

export type ReviewSubmit = z.infer<typeof reviewSubmitSchema>

export function avgScore(r: { scoreTaste: number; scoreValue: number; scoreAtmosphere: number }) {
  return (r.scoreTaste + r.scoreValue + r.scoreAtmosphere) / 3
}
