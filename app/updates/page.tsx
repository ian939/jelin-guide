import { Header } from '@/components/Header'

type Entry = {
  date: string
  title: string
  items: string[]
}

// 새 엔트리는 배열 맨 앞에 추가.
// 정책: 운영자가 명시적으로 "업데이트 내역으로 추가해줘"라고 요청한 변경만 기록.
// 자세한 규칙은 레포 루트의 CLAUDE.md 참고.
const ENTRIES: Entry[] = []

export default function UpdatesPage() {
  return (
    <>
      <Header title="업데이트 내역" back="/map" />
      <main className="px-5 pb-12">
        <p className="mt-4 mb-6 text-sm text-zinc-600">
          제슐렝가이드의 변경 사항입니다. 의견은 우측 상단 메뉴 → <strong>💡 제안하기</strong>로
          보내주세요.
        </p>
        {ENTRIES.length === 0 ? (
          <div className="card text-sm text-zinc-500">
            <p>아직 기록된 업데이트가 없어요.</p>
            <p className="mt-1 text-xs">앞으로의 변경 사항이 여기에 차곡차곡 쌓입니다.</p>
          </div>
        ) : (
          <ol className="space-y-6">
            {ENTRIES.map((e, i) => (
              <li key={i} className="card">
                <p className="text-xs text-zinc-500">{e.date}</p>
                <h3 className="mt-1 text-base font-bold">{e.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-700">
                  {e.items.map((s, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="shrink-0 text-accent">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  )
}
