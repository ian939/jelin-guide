import { Header } from '@/components/Header'

export default function PlaceDetailLoading() {
  return (
    <>
      <Header back="/map" />
      <main className="px-5 pb-12">
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-3 w-40 rounded bg-zinc-100" />
          <div className="h-6 w-2/3 rounded bg-zinc-200" />
          <div className="h-4 w-3/4 rounded bg-zinc-100" />
          <div className="h-4 w-1/2 rounded bg-zinc-100" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 animate-pulse">
          <div className="card h-16 bg-zinc-50" />
          <div className="card h-16 bg-zinc-50" />
          <div className="card h-16 bg-zinc-50" />
        </div>
        <div className="mt-6 card h-24 animate-pulse bg-zinc-50" />
        <div className="mt-5 grid grid-cols-2 gap-2 animate-pulse">
          <div className="h-10 rounded-xl bg-zinc-100" />
          <div className="h-10 rounded-xl bg-zinc-100" />
        </div>
        <section className="mt-8 space-y-3 animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-200" />
          <div className="card h-24 bg-zinc-50" />
          <div className="card h-24 bg-zinc-50" />
        </section>
      </main>
    </>
  )
}
