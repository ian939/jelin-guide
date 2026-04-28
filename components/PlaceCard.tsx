import Link from 'next/link'
import { Stars } from './Stars'
import { CATEGORY_LABEL, type CategoryCode } from '@/lib/validators/place'

export type PlaceListItem = {
  id: string
  name: string
  category: CategoryCode
  zeropaySelfReport: boolean
  menuMemo?: string | null
  priceMemo?: string | null
  reviewCount: number
  avgScore: number | null
}

export function PlaceCard({ place }: { place: PlaceListItem }) {
  return (
    <Link href={`/places/${place.id}`} className="card flex flex-col gap-2 hover:bg-zinc-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{place.name}</h3>
          <p className="text-xs text-zinc-500">
            {CATEGORY_LABEL[place.category]}
            {place.priceMemo ? ` · ${place.priceMemo}` : ''}
          </p>
        </div>
        {place.zeropaySelfReport ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
            제로페이
          </span>
        ) : null}
      </div>
      {place.menuMemo ? (
        <p className="line-clamp-1 text-sm text-zinc-600">{place.menuMemo}</p>
      ) : null}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <Stars value={place.avgScore} />
        <span>리뷰 {place.reviewCount}</span>
      </div>
    </Link>
  )
}
