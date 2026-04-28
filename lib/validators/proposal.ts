import { z } from 'zod'

export const PROPOSAL_CATEGORIES = ['UI', 'FEATURE', 'BUG', 'OTHER'] as const
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number]

export const PROPOSAL_CATEGORY_LABEL: Record<ProposalCategory, string> = {
  UI: 'UI',
  FEATURE: '기능',
  BUG: '버그',
  OTHER: '기타',
}

export const proposalSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력하세요.').max(80),
  body: z.string().trim().min(1, '내용을 입력하세요.').max(2000),
  category: z.enum(PROPOSAL_CATEGORIES),
})
