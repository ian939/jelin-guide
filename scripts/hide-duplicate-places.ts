/**
 * 중복으로 판단된 가게를 hide 처리.
 *
 * 운영 흐름:
 *   1) pnpm tsx scripts/find-duplicate-places.ts
 *   2) output/duplicates-YYYYMMDD.csv 검수 — A는 살리고 B는 hide할 페어 결정
 *   3) 아래 TARGETS 배열에 hide할 B 가게 정보 기입 (이름 + 주소 정규식 + 등록자 닉네임)
 *   4) pnpm tsx scripts/hide-duplicate-places.ts
 *
 * 멱등 — 이미 hidden인 가게는 skip.
 */
import { prisma } from '../lib/db'

type Target = {
  name: string
  addrPattern: RegExp
  createdByNickname?: string
}

const TARGETS: Target[] = [
  { name: '화항풍국제무역（주） 알펜', addrPattern: /학동로37길 19/, createdByNickname: '회사장부' },
  { name: '영칼로리포케 서울학동역점', addrPattern: /학동로25길 11/, createdByNickname: 'Zen' },
  { name: '최가맛뜸', addrPattern: /학동로37길 23/, createdByNickname: '회사장부' },
]

async function main() {
  for (const t of TARGETS) {
    const cands = await prisma.place.findMany({
      where: { name: t.name, isHidden: false },
      include: { createdBy: { select: { nickname: true } } },
    })
    const match = cands.filter(
      p =>
        t.addrPattern.test(p.address) &&
        (!t.createdByNickname || p.createdBy.nickname === t.createdByNickname)
    )
    if (match.length === 0) {
      console.log(`= skip (already hidden or not found): ${t.name}`)
      continue
    }
    if (match.length > 1) {
      console.log(`✗ AMBIGUOUS: ${t.name} → ${match.map(m => m.id).join(', ')}`)
      continue
    }
    const p = match[0]
    await prisma.place.update({
      where: { id: p.id },
      data: { isHidden: true, hiddenAt: new Date() },
    })
    console.log(`✓ hide: ${p.name}  /  ${p.address}  /  by ${p.createdBy.nickname}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
