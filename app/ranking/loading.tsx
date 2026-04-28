export default function RankingLoading() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-zinc-100 bg-white/90 px-4">
        <div className="h-4 w-16 rounded bg-zinc-200" />
      </div>
      <main className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(i => (
            <div key={i} className="card">
              <div className="mb-2 h-4 w-2/3 rounded bg-zinc-200" />
              <div className="mb-3 h-3 w-1/2 rounded bg-zinc-200" />
              <div className="space-y-2">
                {[0, 1, 2].map(j => (
                  <div key={j} className="h-3 w-full rounded bg-zinc-200" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
