import { z } from 'zod'

export const reportSubmitSchema = z.object({
  targetType: z.enum(['REVIEW', 'PLACE']),
  targetId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
})

export const REPORT_AUTOHIDE_THRESHOLD = 3

export const voteSubmitSchema = z.object({
  isAvailable: z.boolean(),
})
