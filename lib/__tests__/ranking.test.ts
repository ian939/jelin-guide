import { describe, expect, it } from 'vitest'
import { __test__ } from '@/lib/ranking'

const { startOfMonthKST } = __test__

describe('startOfMonthKST', () => {
  it('returns the 1st 00:00 KST of the current month', () => {
    // 2026-04-15 12:00 UTC → KST 21:00 → 같은 달
    const probe = new Date('2026-04-15T12:00:00Z')
    const start = startOfMonthKST(probe)
    // 2026-04-01 00:00 KST = 2026-03-31 15:00 UTC
    expect(start.toISOString()).toBe('2026-03-31T15:00:00.000Z')
  })

  it('handles month boundary near KST midnight', () => {
    // 2026-04-30 23:30 KST = 2026-04-30 14:30 UTC → 4월에 속함
    const probe = new Date('2026-04-30T14:30:00Z')
    const start = startOfMonthKST(probe)
    expect(start.toISOString()).toBe('2026-03-31T15:00:00.000Z')
  })
})
