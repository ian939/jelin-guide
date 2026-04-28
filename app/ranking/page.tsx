import { Header } from '@/components/Header'
import { getMonthlyJury, getProposalRanking, type RankRow } from '@/lib/ranking'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const [proposal, monthly] = await Promise.all([
    getProposalRanking(20),
    getMonthlyJury(20),
  ])

  return (
    <>
      <Header title="랭킹" back="/" />
      <main className="px-4 pb-12">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Section title="🔥 추천 랭킹" subtitle="누적 맛집 추천 수" rows={proposal} unit="추천" />
          <Section title="👑 심사 랭킹" subtitle="이번 달 리뷰 수" rows={monthly} unit="리뷰" />
        </div>
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
