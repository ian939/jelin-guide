export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="text-zinc-300">평점 없음</span>
  const rounded = Math.round(value * 10) / 10
  return (
    <span className="inline-flex items-center gap-1 text-amber-500" style={{ fontSize: size }}>
      <span aria-hidden>★</span>
      <span className="font-medium text-zinc-800">{rounded.toFixed(1)}</span>
    </span>
  )
}

export function StarSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className={n <= value ? 'text-amber-500 text-xl' : 'text-zinc-300 text-xl'}
            aria-label={`${label} ${n}점`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
