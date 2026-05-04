/**
 * 중복으로 판단된 가게를 hide + alias 매핑 기록.
 *
 * 운영 흐름:
 *   1) pnpm tsx scripts/find-duplicate-places.ts
 *   2) output/duplicates-YYYYMMDD.csv 검수 — A는 살리고 B는 hide할 페어 결정
 *   3) 아래 TARGETS 배열에 hide할 B 가게 정보 + 합쳐질 A 가게 정보 기입
 *   4) pnpm tsx scripts/hide-duplicate-places.ts
 *
 * 동작:
 *   - B 가게의 isHidden=true, hiddenAt 셋
 *   - data/place-aliases.json 에 { B의 placeId: A의 placeId } 매핑 기록
 *     → apply-monthly-ranking.ts 가 HIDDEN_DUP 만났을 때 A로 자동 매핑해서 vote·visits 부여
 *
 * 멱등 — 이미 hidden 이거나 alias 기록된 항목은 skip.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../lib/db'
import type { Place } from '@prisma/client'

type Target = {
  /** hide 대상 (B) 식별자 */
  name: string
  addrPattern: RegExp
  createdByNickname?: string
  /** 합쳐질 활성 가게 (A) 식별자 */
  mergeIntoName: string
  mergeIntoAddrPattern: RegExp
  mergeIntoCreatedByNickname?: string
}

const TARGETS: Target[] = [
  {
    name: '화항풍국제무역（주） 알펜',
    addrPattern: /학동로37길 19/,
    createdByNickname: '회사장부',
    mergeIntoName: '알펜호프',
    mergeIntoAddrPattern: /학동로37길 19/,
  },
  {
    name: '영칼로리포케 서울학동역점',
    addrPattern: /학동로25길 11/,
    createdByNickname: 'Zen',
    mergeIntoName: '영칼로리포케&샐러드 서울학동역점',
    mergeIntoAddrPattern: /학동로25길 11/,
  },
  {
    name: '최가맛뜸',
    addrPattern: /학동로37길 23/,
    createdByNickname: '회사장부',
    mergeIntoName: '맛뜸최가뼈다귀해장국 논현1호점',
    mergeIntoAddrPattern: /학동로37길 23/,
  },
]

async function findAll(
  name: string,
  addrPattern: RegExp,
  nickname: string | undefined,
  isHidden: boolean
): Promise<Place[]> {
  const cands = await prisma.place.findMany({
    where: { name, isHidden },
    include: { createdBy: { select: { nickname: true } } },
  })
  return cands.filter(p =>
    addrPattern.test(p.address) && (!nickname || p.createdBy.nickname === nickname)
  )
}

async function findOneActive(
  name: string,
  addrPattern: RegExp,
  nickname: string | undefined
): Promise<Place | null> {
  const all = await findAll(name, addrPattern, nickname, false)
  return all.length === 1 ? all[0] : null
}

async function main() {
  const aliasPath = resolve(process.cwd(), 'data/place-aliases.json')
  const aliases: Record<string, string> = JSON.parse(
    (() => {
      try {
        return readFileSync(aliasPath, 'utf8')
      } catch {
        return '{}'
      }
    })() || '{}'
  )

  for (const t of TARGETS) {
    // hide 대상 — 같은 이름·주소·등록자가 여러 번 등록·hide된 케이스도 모두 처리
    const allMatching = [
      ...(await findAll(t.name, t.addrPattern, t.createdByNickname, true)),
      ...(await findAll(t.name, t.addrPattern, t.createdByNickname, false)),
    ]
    if (allMatching.length === 0) {
      console.log(`= skip (not found): ${t.name}`)
      continue
    }

    // 합쳐질 활성 가게
    const mergeInto = await findOneActive(
      t.mergeIntoName,
      t.mergeIntoAddrPattern,
      t.mergeIntoCreatedByNickname
    )
    if (!mergeInto) {
      console.log(`✗ mergeInto not found or ambiguous: ${t.mergeIntoName}`)
      continue
    }

    for (const p of allMatching) {
      if (!p.isHidden) {
        await prisma.place.update({
          where: { id: p.id },
          data: { isHidden: true, hiddenAt: new Date() },
        })
        console.log(`✓ hide: ${p.name} (${p.id})`)
      } else {
        console.log(`= already hidden: ${p.name} (${p.id})`)
      }
      if (aliases[p.id] !== mergeInto.id) {
        aliases[p.id] = mergeInto.id
        console.log(`  → alias: ${p.name} ⇒ ${mergeInto.name}`)
      }
    }
  }

  writeFileSync(aliasPath, JSON.stringify(aliases, null, 2) + '\n', 'utf8')
  console.log(`\nsaved: ${aliasPath}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
