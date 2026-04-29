// 모든 E2E 테스트 종료 후 1회 호출.
// E2E 시나리오에서 만든 사용자(`e2e_*`, `editor_*`)와 그 사용자가 만든 가게·리뷰·리비전을
// production DB에서 정리한다.
//
// 우리는 E2E도 production DB(.env DATABASE_URL)를 사용한다 — 이 정리가 없으면 매 실행마다
// 테스트 가게(여의도공원·잠실역 등)가 production에 누적된다.
//
// 안전 장치:
//   - nickname 패턴으로 정확히 e2e/editor만 매칭
//   - 운영자/일반 사용자 데이터는 건드리지 않음
//   - 실패해도 throw하지 않음 (E2E 결과 해치지 않게)

import { PrismaClient } from '@prisma/client'

export default async function globalTeardown() {
  const prisma = new PrismaClient()
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: { startsWith: 'e2e_' } },
          { nickname: { startsWith: 'editor_' } },
        ],
      },
      select: { id: true, nickname: true },
    })
    if (testUsers.length === 0) return

    const userIds = testUsers.map(u => u.id)
    // FK 의존 순서로 정리
    await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } })
    await prisma.zeropayVote.deleteMany({ where: { voterId: { in: userIds } } })
    await prisma.review.deleteMany({ where: { authorId: { in: userIds } } })
    await prisma.placeRevision.deleteMany({ where: { editorId: { in: userIds } } })
    // Place 삭제 시 cascade로 같은 place의 남은 Review/PlaceRevision/ZeropayVote 자동 삭제
    await prisma.place.deleteMany({ where: { createdById: { in: userIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })

    // eslint-disable-next-line no-console
    console.log(`[teardown] cleaned ${testUsers.length} test user(s):`, testUsers.map(u => u.nickname).join(', '))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[teardown] cleanup failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}
