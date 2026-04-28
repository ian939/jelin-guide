export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/90 px-4">
        <div className="h-4 w-28 rounded bg-zinc-200" />
        <div className="flex gap-3">
          <div className="h-3 w-8 rounded bg-zinc-200" />
          <div className="h-3 w-8 rounded bg-zinc-200" />
          <div className="h-3 w-12 rounded bg-zinc-200" />
        </div>
      </div>
      <main className="px-4 pt-4">
        <div className="mb-4 h-5 w-32 rounded bg-zinc-200" />
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card">
              <div className="mb-2 h-4 w-2/3 rounded bg-zinc-200" />
              <div className="h-3 w-1/3 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
