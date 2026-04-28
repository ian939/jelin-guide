import { Header } from '@/components/Header'
import {
  getHallOfFame,
  getMonthlyJury,
  getProposalRanking,
  type RankRow,
} from '@/lib/ranking'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const [monthly, hall, proposal] = await Promise.all([
    getMonthlyJury(20),
    getHallOfFame(20),
    getProposalRanking(20),
  ])

  return (
    <>
      <Header title="랭킹" back="/" />
      <main className="space-y-8 px-4 pb-12">
        <Section title="👑 이달의 심사위원" subtitle="이번 달 작성한 리뷰 수" rows={monthly} />
        <Section title="🌟 명예의 전당" subtitle="누적 리뷰 수" rows={hall} />
        <Section title="🔥 추천 랭킹" subtitle="누적 맛집 추천 수" rows={proposal} />
      </main>
    </>
  )
}

function Section({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: RankRow[]
}) {
  return (
    <section>
      <h2 className="px-1 text-base font-bold">{title}</h2>
      <p className="mb-3 px-1 text-xs text-zinc-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="card text-sm text-zinc-500">아직 데이터가 없어요.</p>
      ) : (
        <ol className="card divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <li key={r.userId} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="mr-2 font-semibold">{i + 1}위</span>
                {r.nickname}
              </span>
              <span className="text-zinc-500">{r.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
