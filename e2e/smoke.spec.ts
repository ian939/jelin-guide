import { expect, test } from '@playwright/test'

// 동일 닉네임·주소 충돌 회피 — 매 실행마다 unique
const NICK = `e2e_${Date.now().toString(36).slice(-6)}`
const PWD = 'e2e-test-12345'
const PLACE_NAME = `테스트가게_${NICK}`
// 50m 이상 떨어진 한국 명소 회전 — 매 실행마다 다른 좌표 → 중복 차단 회피
const ADDRESSES = [
  '서울특별시 중구 세종대로 110', // 서울시청
  '서울특별시 강남구 테헤란로 152', // 강남파이낸스센터
  '서울특별시 종로구 사직로 161', // 경복궁
  '서울특별시 영등포구 여의대로 24', // 여의도
  '서울특별시 마포구 양화로 45', // 합정
  '서울특별시 용산구 이태원로 200',
  '부산광역시 해운대구 해운대해변로 264',
  '인천광역시 중구 공항로 272', // 인천공항
]
const ADDRESS = ADDRESSES[Math.floor(Date.now() / 1000) % ADDRESSES.length]

// 콘솔 에러를 추적해서 React runtime 에러를 잡는다
function attachConsoleListeners(page: import('@playwright/test').Page, sink: string[]) {
  page.on('console', msg => {
    if (msg.type() === 'error') sink.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', err => {
    sink.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`)
  })
  // 진짜 사용자 영향 에러만: requestfailed/response는 진단용으로만, 어설션엔 미포함
}

// 어설션용 필터 — Next.js router prefetch가 navigation 중에 취소되는 ERR_ABORTED는 정상
function realErrors(errors: string[]): string[] {
  return errors.filter(e => e.startsWith('[pageerror]') || e.startsWith('[console.error]'))
}

test.describe.configure({ mode: 'serial' })

test('전체 골든 패스: 가입 → 로그인 → 맛집 추천 → 리뷰 → 마이페이지', async ({ page }) => {
  const errors: string[] = []
  attachConsoleListeners(page, errors)

  // 1. 홈 진입 (부트스트랩 모드 또는 큐레이션)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /제슐렝가이드/ })).toBeVisible()

  // 2. 가입
  await page.goto('/signup')
  await page.getByLabel(/닉네임/).fill(NICK)
  await page.getByLabel(/비밀번호/).fill(PWD)
  await page.getByRole('button', { name: /가입하고 시작하기/ }).click()
  await page.waitForURL('/', { timeout: 15_000 })
  // 헤더에 닉네임 표시 (자동 로그인)
  await expect(page.getByRole('link', { name: NICK })).toBeVisible({ timeout: 10_000 })

  // 3. 맛집 추천
  await page.goto('/places/new')
  await page.getByLabel('상호 *').fill(PLACE_NAME)
  await page.getByLabel('주소 *').fill(ADDRESS)
  await page.getByLabel('카테고리 *').selectOption('KOREAN')
  await page.getByLabel('대표 메뉴 (선택)').fill('김치찌개')
  await page.getByLabel('가격대 (선택)').fill('1만원대')
  await page.getByRole('button', { name: /^추천하기$/ }).click()

  // 4. 가맹점 상세로 이동 확인
  await page.waitForURL(/\/places\/[a-z0-9]+$/, { timeout: 15_000 }).catch(async err => {
    console.log('--- DIAGNOSTIC: waitForURL timeout ---')
    console.log('current URL:', page.url())
    console.log('errors so far:\n' + errors.join('\n'))
    console.log('page text head:\n' + (await page.locator('body').innerText()).slice(0, 800))
    throw err
  })
  await expect(page.getByRole('main').getByRole('heading', { name: PLACE_NAME })).toBeVisible()
  await expect(page.getByText(/제로페이/).first()).toBeVisible()

  // 5. 리뷰 작성
  await page.getByRole('link', { name: /리뷰 쓰기/ }).click()
  await page.waitForURL(/\/reviews\/new$/)
  // StarSelect: 5점 = 마지막 별 클릭
  for (const label of ['맛', '가성비', '분위기']) {
    const row = page.getByText(label, { exact: true }).locator('..').locator('..')
    const stars = row.getByRole('button', { name: new RegExp(`${label} 5점`) })
    await stars.click()
  }
  await page.getByLabel(/한마디/).fill('테스트 리뷰입니다. 맛 좋음.')
  await page.getByRole('button', { name: /리뷰 등록/ }).click()
  await page.waitForURL(/\/places\/[a-z0-9]+$/, { timeout: 15_000 })

  // 6. 가맹점 상세에서 평균 평점 노출 확인
  await expect(page.getByRole('heading', { name: /^리뷰 1$/ })).toBeVisible()

  // 7. 마이페이지에서 내 추천·리뷰 확인
  await page.goto('/mypage')
  await expect(page.getByRole('heading', { name: new RegExp(`^${NICK}`) })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(PLACE_NAME) }).first()).toBeVisible()

  // 8. 사용자 영향 에러 0건 (router prefetch 취소 ERR_ABORTED는 정상이라 제외)
  const real = realErrors(errors)
  expect(real, `브라우저 런타임 에러:\n${real.join('\n')}`).toEqual([])
})

test('지도 페이지 — 마커·SK일렉링크 리센터·추천 FAB', async ({ page }) => {
  const errors: string[] = []
  attachConsoleListeners(page, errors)
  await page.goto('/map')
  await expect(page.getByRole('heading', { name: /지도/ })).toBeVisible()

  // SK일렉링크 리센터 버튼이 지도 위에 노출
  await expect(page.getByRole('button', { name: /SK일렉링크/ })).toBeVisible()

  // "+ 맛집 추천하기" floating action button이 보이고 /places/new 로 연결
  const fab = page.getByRole('link', { name: /\+ 맛집 추천하기/ })
  await expect(fab).toBeVisible()
  await expect(fab).toHaveAttribute('href', '/places/new')

  // SDK는 외부 의존이라 마커는 검증하지 않음 — React 런타임 에러만 잡음
  const reactErrors = errors.filter(e => e.startsWith('[pageerror]'))
  expect(reactErrors, `React 런타임 에러:\n${reactErrors.join('\n')}`).toEqual([])
})

test('랭킹 페이지 — 보드 3개 노출', async ({ page }) => {
  await page.goto('/ranking')
  await expect(page.getByRole('heading', { name: /이달의 심사위원/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /명예의 전당/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /추천 랭킹/ })).toBeVisible()
})

test('위키식 수정·롤백 — 두 번째 사용자가 정보를 수정하고, 첫 사용자가 롤백', async ({ browser }) => {
  // 골든 패스에서 만든 가맹점이 있다고 가정. 새 사용자를 만들어 그 가게를 수정한다.
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const errors: string[] = []
  attachConsoleListeners(page, errors)

  // 1) 새 사용자 가입
  const editorNick = `editor_${Date.now().toString(36).slice(-6)}`
  await page.goto('/signup')
  await page.getByLabel(/닉네임/).fill(editorNick)
  await page.getByLabel(/비밀번호/).fill(PWD)
  await page.getByRole('button', { name: /가입하고 시작하기/ }).click()
  await page.waitForURL('/', { timeout: 15_000 })

  // 2) 가맹점 리스트 첫 항목 진입 (골든 패스에서 등록한 가게)
  await page.goto('/places')
  const firstPlaceLink = page.getByRole('main').getByRole('link').first()
  await firstPlaceLink.click()
  await page.waitForURL(/\/places\/[a-z0-9]+$/)
  const detailUrl = page.url()

  // 3) "정보 수정" 진입 → 메모 변경
  await page.getByRole('link', { name: /정보 수정/ }).click()
  await page.waitForURL(/\/edit$/)
  const newMemo = `편집됨_${editorNick}`
  await page.getByLabel(/대표 메뉴/).fill(newMemo)
  await page.getByRole('button', { name: /저장/ }).click()
  await page.waitForURL(/\/places\/[a-z0-9]+$/, { timeout: 15_000 })
  await expect(page.getByText(newMemo)).toBeVisible()

  // 4) 수정 이력 진입 → 이전 버전(인덱스 1)으로 롤백
  await page.getByRole('link', { name: /수정 이력 보기/ }).click()
  await page.waitForURL(/\/history$/)
  // RollbackButton이 window.confirm을 띄우므로 자동 accept
  page.on('dialog', d => d.accept())
  // 이력 페이지의 두번째 항목 = 직전 버전
  await page.getByRole('button', { name: /이 버전으로 되돌리기/ }).first().click()
  // 롤백 후 페이지가 그대로 (refresh됨), 새 리비전이 추가됨 — 확인
  await page.waitForLoadState('networkidle')
  // 다시 상세로 가서 메모가 원복되었는지 확인
  await page.goto(detailUrl)
  await expect(page.getByText(newMemo)).not.toBeVisible()

  const real = realErrors(errors)
  expect(real, `런타임 에러:\n${real.join('\n')}`).toEqual([])
  await ctx.close()
})

test('/admin — Basic Auth 보호', async ({ browser }) => {
  // 인증 없이는 401
  const noAuth = await browser.newContext()
  const page1 = await noAuth.newPage()
  const r1 = await page1.goto('/admin')
  expect(r1?.status()).toBe(401)
  await noAuth.close()

  // BASIC_AUTH로는 200
  const withAuth = await browser.newContext({
    httpCredentials: { username: 'admin', password: 'jelin-admin-2026' },
  })
  const page2 = await withAuth.newPage()
  const r2 = await page2.goto('/admin')
  expect(r2?.status()).toBe(200)
  await expect(page2.getByRole('heading', { name: '/admin' })).toBeVisible()
  await withAuth.close()
})
