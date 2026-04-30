/**
 * 네이버맵 크롤링 결과(zeropay-places.csv)를 학동위키 DB에 import.
 *
 * 정책:
 * - 시스템 사용자 "학동봇" 으로 upsert (passwordHash는 매칭 안 되는 더미 → 로그인 불가)
 * - 이름 매칭 + 좌표 50m 이내 (lib/places.ts의 findDuplicatePlace) → skip + tags 보강
 * - 신규 가게는 Place + PlaceRevision 첫 entry 생성 (editor=학동봇)
 * - tags 자동 부여: CSV tags(도보 등) + 네이버 리뷰 100+/500+
 * - crewVerified=false 기본 (크루가 직접 다녀와 리뷰·투표하면 자동 true)
 *
 * idempotent — 한 번 더 돌려도 새 가게 안 만들고 tags 누락분만 보강.
 */
import bcrypt from 'bcryptjs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { prisma } from '../lib/db'
import { findDuplicatePlace } from '../lib/places'
import { CATEGORIES, MEAL_TYPES, PLACE_TAGS } from '../lib/validators/place'
import type { CategoryCode, MealTypeCode, PlaceTag } from '../lib/validators/place'

const BOT_NICKNAME = '학동봇'
const CSV_PATH = resolve(process.cwd(), '네이버맵 크롤링/output/zeropay-places.csv')

type Row = Record<string, string>

// 안전한 CSV 파서 — 따옴표 안 콤마·개행 처리.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur = ''
  let row: string[] = []
  let inQuotes = false
  // BOM 제거
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cur += c
      }
    } else {
      if (c === ',') {
        row.push(cur)
        cur = ''
      } else if (c === '"') {
        inQuotes = true
      } else if (c === '\n') {
        row.push(cur)
        cur = ''
        rows.push(row)
        row = []
      } else if (c === '\r') {
        // skip
      } else {
        cur += c
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur)
    rows.push(row)
  }
  return rows.filter(r => r.some(cell => cell.length > 0))
}

function csvToRows(text: string): Row[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(r => {
    const obj: Row = {}
    headers.forEach((h, i) => (obj[h] = (r[i] ?? '').trim()))
    return obj
  })
}

function mapNaverReviewTag(count: number): PlaceTag | null {
  if (count >= 500) return '네이버 500+'
  if (count >= 100) return '네이버 100+'
  return null
}

async function ensureBot() {
  const existing = await prisma.user.findUnique({ where: { nickname: BOT_NICKNAME } })
  if (existing) return existing
  // bcrypt.compare가 절대 매칭 안 되도록 random uuid 해시 — 로그인 시도해도 항상 false
  const passwordHash = await bcrypt.hash(crypto.randomUUID() + Date.now(), 10)
  return prisma.user.create({
    data: {
      nickname: BOT_NICKNAME,
      passwordHash,
      email: null,
    },
  })
}

async function main() {
  const text = await readFile(CSV_PATH, 'utf8')
  const rows = csvToRows(text)
  console.log(`CSV parsed: ${rows.length} rows`)

  const bot = await ensureBot()
  console.log(`bot user: ${bot.nickname} (${bot.id})`)

  let created = 0
  let augmented = 0
  let skipped = 0
  let invalid = 0

  for (const r of rows) {
    const name = r['name']
    const address = r['address']
    const lat = parseFloat(r['lat'])
    const lng = parseFloat(r['lng'])
    if (!name || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      invalid++
      continue
    }
    const category = (CATEGORIES.includes(r['category'] as CategoryCode)
      ? r['category']
      : 'ETC') as CategoryCode
    const mealType = (MEAL_TYPES.includes(r['mealType'] as MealTypeCode)
      ? r['mealType']
      : 'LUNCH') as MealTypeCode
    const naverReviewCount = parseInt(r['reviewCount'] || '0', 10) || 0
    const naverTag = mapNaverReviewTag(naverReviewCount)

    // CSV tags (";" 구분) + 네이버 칩 → PLACE_TAGS만 통과
    const csvTagList = (r['tags'] || '')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
    const allTags = new Set<string>([...csvTagList, ...(naverTag ? [naverTag] : [])])
    const tags = Array.from(allTags).filter((t): t is PlaceTag =>
      (PLACE_TAGS as readonly string[]).includes(t)
    )

    const dup = await findDuplicatePlace({ name, lat, lng })
    if (dup) {
      // tags 보강 — 누락된 PLACE_TAGS만 추가
      const existing = new Set(dup.tags ?? [])
      const missing = tags.filter(t => !existing.has(t))
      if (missing.length > 0) {
        await prisma.place.update({
          where: { id: dup.id },
          data: { tags: [...existing, ...missing] },
        })
        augmented++
        console.log(`  ↻ ${dup.name} ← tags 보강: ${missing.join(', ')}`)
      } else {
        skipped++
      }
      continue
    }

    // 신규 가게 + 첫 PlaceRevision
    await prisma.$transaction(async tx => {
      const place = await tx.place.create({
        data: {
          name,
          address,
          lat,
          lng,
          category,
          mealType,
          zeropaySelfReport: r['zeropaySelfReport'] === 'Y',
          menuMemo: r['menuMemo'] || null,
          priceMemo: r['priceMemo'] || null,
          recommendReason: null,
          tags,
          createdById: bot.id,
        },
      })
      await tx.placeRevision.create({
        data: {
          placeId: place.id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          category: place.category,
          mealType: place.mealType,
          zeropaySelfReport: place.zeropaySelfReport,
          menuMemo: place.menuMemo,
          priceMemo: place.priceMemo,
          recommendReason: place.recommendReason,
          tags: place.tags,
          editorId: bot.id,
        },
      })
    })
    created++
    console.log(`  + ${name}`)
  }

  console.log('')
  console.log(`✓ 신규: ${created}`)
  console.log(`↻ tags 보강: ${augmented}`)
  console.log(`= skip: ${skipped}`)
  console.log(`✗ invalid: ${invalid}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
