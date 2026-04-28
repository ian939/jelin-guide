export default function MapLoading() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-zinc-100 bg-white/90 px-4">
        <div className="h-4 w-12 rounded bg-zinc-200" />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-7 w-14 shrink-0 rounded-full bg-zinc-200" />
        ))}
      </div>
      <div className="h-[60vh] w-full bg-zinc-100" />
      <main className="px-4 pt-4">
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="card">
              <div className="mb-2 h-4 w-1/2 rounded bg-zinc-200" />
              <div className="h-3 w-1/4 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
