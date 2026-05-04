import Link from 'next/link'
import { Header } from '@/components/Header'
import { prisma } from '@/lib/db'
import { getMonthlyJury, getProposalRanking, type RankRow } from '@/lib/ranking'
import monthlyVisitsRaw from '@/data/monthly-visits.json'

export const dynamic = 'force-dynamic'

type VisitItem = { placeId: string; visits: number }
type VisitsJson = Record<string, { label: string; items: VisitItem[] }>

const monthlyVisits = monthlyVisitsRaw as VisitsJson

async function getCrewVisitBoards() {
  const periods = Object.keys(monthlyVisits).sort().reverse() // 최신 먼저
  if (periods.length === 0) return []
  // 모든 period의 placeId 수집해서 한 번에 조회
  const allIds = new Set<string>()
  for (const p of periods) {
    for (const it of monthlyVisits[p].items) allIds.add(it.placeId)
  }
  const places = await prisma.place.findMany({
    where: { id: { in: Array.from(allIds) }, isHidden: false },
    select: { id: true, name: true, category: true },
  })
  const map = new Map(places.map(p => [p.id, p]))
  return periods.map(period => {
    const board = monthlyVisits[period]
    const rows = board.items
      .map(it => {
        const p = map.get(it.placeId)
        if (!p) return null // hidden 또는 삭제된 가게는 제외
        return { placeId: p.id, name: p.name, visits: it.visits }
      })
      .filter((x): x is { placeId: string; name: string; visits: number } => x !== null)
    return { period, label: board.label, rows }
  })
}

export default async function RankingPage() {
  const [proposal, monthly, crewVisitBoards] = await Promise.all([
    getProposalRanking(20),
    getMonthlyJury(20),
    getCrewVisitBoards(),
  ])

  return (
    <>
      <Header title="랭킹" back="/" />
      <main className="px-4 pb-12">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Section title="🔥 추천 랭킹" subtitle="누적 맛집 추천 수" rows={proposal} unit="추천" />
          <Section title="👑 검증 랭킹" subtitle="이번 달 리뷰 수" rows={monthly} unit="리뷰" />
        </div>

        {crewVisitBoards.map(b => (
          <section key={b.period} className="card mt-4">
            <h2 className="text-sm font-bold">🍽️ {b.label}</h2>
            <p className="mb-3 text-[11px] text-zinc-500">사내 결제 데이터 기준 · 방문 횟수</p>
            {b.rows.length === 0 ? (
              <p className="text-xs text-zinc-500">데이터가 없어요.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {b.rows.map((r, i) => (
                  <li key={r.placeId} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/places/${r.placeId}`}
                      className="flex min-w-0 flex-1 items-center gap-2 truncate hover:underline"
                    >
                      <span className="w-5 shrink-0 text-right font-semibold text-zinc-500">
                        {i + 1}
                      </span>
                      <span className="truncate">{r.name}</span>
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-500">{r.visits}회</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </main>
    </>
  )
}

function Section({
  title,
  subtitle,
  rows,
  unit,
}: {
  title: string
  subtitle: string
  rows: RankRow[]
  unit: string
}) {
  return (
    <section className="card">
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="mb-3 text-[11px] text-zinc-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">아직 데이터가 없어요.</p>
      ) : (
        <ol className="space-y-2 text-xs">
          {rows.map((r, i) => (
            <li key={r.userId} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                <span className="mr-1 font-semibold">{i + 1}</span>
                {r.nickname}
              </span>
              <span className="shrink-0 text-zinc-500">
                {unit} {r.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
