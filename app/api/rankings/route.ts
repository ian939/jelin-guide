import { NextResponse } from 'next/server'
import { getHallOfFame, getMonthlyJury, getProposalRanking } from '@/lib/ranking'

export async function GET() {
  const [monthly, hall, proposal] = await Promise.all([
    getMonthlyJury(50),
    getHallOfFame(50),
    getProposalRanking(50),
  ])
  return NextResponse.json({ monthly, hall, proposal })
}
