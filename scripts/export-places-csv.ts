import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../lib/db'

const HEADERS = [
  'id',
  'name',
  'address',
  'lat',
  'lng',
  'category',
  'mealType',
  'zeropaySelfReport',
  'menuMemo',
  'priceMemo',
  'recommendReason',
  'tags',
  'reviewCount',
  'avgScore',
  'createdAt',
  'createdBy',
]

function escape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  const escaped = s.replace(/"/g, '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

async function main() {
  const places = await prisma.place.findMany({
    where: { isHidden: false },
    include: { createdBy: { select: { nickname: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const rows = places.map(p => [
    p.id,
    p.name,
    p.address,
    p.lat,
    p.lng,
    p.category,
    p.mealType,
    p.zeropaySelfReport ? 'Y' : 'N',
    p.menuMemo ?? '',
    p.priceMemo ?? '',
    p.recommendReason ?? '',
    (p.tags ?? []).join(';'),
    p.reviewCount,
    p.avgScore !== null ? p.avgScore.toFixed(2) : '',
    p.createdAt.toISOString(),
    p.createdBy.nickname,
  ])
  // UTF-8 BOM 으로 엑셀 한글 깨짐 방지
  const csv =
    '﻿' + [HEADERS.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const out = resolve(process.cwd(), 'output/places.csv')
  writeFileSync(out, csv, 'utf8')
  console.log(`✓ ${places.length}개 가게 → ${out}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
