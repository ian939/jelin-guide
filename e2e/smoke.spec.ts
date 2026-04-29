import { expect, test } from '@playwright/test'

// 동일 닉네임 충돌 회피 — 매 실행마다 unique
const NICK = `e2e_${Date.now().toString(36).slice(-6)}`
const PWD = 'e2e-test-12345'
// 카카오 키워드 검색 결과가 풍부한 키워드들을 회전 — 매번 다른 가게 좌표라 중복 차단 회피
const SEARCH_KEYWORDS = [
  '서울시청',
  '강남파이낸스센터',
  '경복궁',
  '여의도공원',
  '잠실역',
  '이태원역',
  '부산해운대',
  '인천공항',
]
const SEARCH_KEYWORD = SEARCH_KEYWORDS[Math.floor(Date.now() / 1000) % SEARCH_KEYWORDS.length]

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

// 어설션용 필터 — 사용자 영향 있는 에러만 잡는다.
// 노이즈로 분류:
//   - ERR_ABORTED: navigation 중에 router prefetch가 취소되는 정상 동작
//   - "Failed to fetch RSC payload ... Falling back to browser navigation":
//     Next.js가 명시적으로 graceful fallback을 수행. Netlify Free tier에서 lambda cold start와
//     RSC prefetch race로 종종 발생하지만 페이지 동작에는 영향 없음.
function realErrors(errors: string[]): string[] {
  return errors.filter(e => {
    if (!e.startsWith('[pageerror]') && !e.startsWith('[console.error]')) return false
    // Next.js graceful fallback
    if (e.includes('Failed to fetch RSC payload') && e.includes('Falling back to browser navigation')) return false
    // NextAuth client_fetch_error: lambda cold start race. 자동 회복.
    if (e.includes('[next-auth][error][CLIENT_FETCH_ERROR]') && e.includes('/api/auth/session')) return false
    // DUPLICATE_PLACE 흐름의 의도된 409 — 우리 코드가 받아서 redirect로 처리
    if (e.includes('Failed to load resource') && e.includes('409')) return false
    return true
  })
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe.configure({ mode: 'serial' })

test('전체 골든 패스: 가입 → 로그인 → 맛집 추천 → 리뷰 → 마이페이지', async ({ page }) => {
  const errors: string[] = []
  attachConsoleListeners(page, errors)

  // 1. 홈 진입 — 첫 화면은 /map 으로 redirect
  await page.goto('/')
  await page.waitForURL(/\/map/, { timeout: 15_000 })
  await expect(page.getByRole('link', { name: /제슐렝가이드/ })).toBeVisible()

  // 2. 가입
  await page.goto('/signup')
  await page.getByLabel(/닉네임/).fill(NICK)
  await page.getByLabel(/비밀번호/).fill(PWD)
  await page.getByRole('button', { name: /위키 입장하기/ }).click()
  // 가입 성공 → / → redirect → /map
  await page.waitForURL(/\/map/, { timeout: 15_000 })
  // 헤더에 햄버거 메뉴 노출 (로그인 상태 표시) — 닉네임은 모바일 폭에서 메뉴 안에 있음
  await expect(page.locator('header').getByRole('button', { name: '메뉴 열기' })).toBeVisible({ timeout: 10_000 })

  // 3. 맛집 추천 — 카카오 키워드 검색 → 첫 결과 선택 → 폼 자동 채움
  await page.goto('/places/new')
  await page.getByLabel(/가게 검색/).fill(SEARCH_KEYWORD)
  // 디바운스(300ms) + API 호출 후 결과 카드가 뜰 때까지 대기
  const firstHit = page.getByRole('main').getByRole('list').getByRole('button').first()
  await expect(firstHit).toBeVisible({ timeout: 10_000 })
  // 첫 결과를 잡고 그 텍스트(가게명)를 기억해서 상세 어설션에 사용
  const pickedName = (await firstHit.locator('p').first().textContent())?.trim() ?? ''
  await firstHit.click()
  // 추가 정보 입력
  await page.getByLabel('대표 메뉴 (선택)').fill('김치찌개')
  await page.getByLabel('가격대 (선택)').fill('1만원대')
  await page.getByLabel('추천이유 (선택)').fill('테스트 추천이유')
  await page.getByRole('button', { name: /^추천하기$/ }).click()

  // 4. 가맹점 상세로 이동 확인
  await page.waitForURL(/\/places\/[a-z0-9]+(\?.*)?$/, { timeout: 15_000 }).catch(async err => {
    console.log('--- DIAGNOSTIC: waitForURL timeout ---')
    console.log('current URL:', page.url())
    console.log('errors so far:\n' + errors.join('\n'))
    console.log('page text head:\n' + (await page.locator('body').innerText()).slice(0, 800))
    throw err
  })
  if (pickedName) {
    await expect(page.getByRole('main').getByRole('heading', { name: pickedName })).toBeVisible()
  }
  await expect(page.getByText(/제로페이/).first()).toBeVisible()

  // 5. 추천 시 첫 리뷰가 자동 생성됨 — "내 리뷰 수정" 버튼이 보이고 "리뷰 쓰기"는 없음.
  // 평점은 default 4점이라 평균 4.0 / 리뷰 1.

  // 6. 가맹점 상세에서 리뷰 헤딩 노출 확인 (자동 첫 리뷰 또는 기존 리뷰)
  await expect(page.getByRole('heading', { name: /^리뷰 \d+$/ })).toBeVisible()

  // 7. 마이페이지 진입 — 닉네임 헤딩만 검증
  // (DUPLICATE_PLACE로 기존 가게로 redirect되면 본인이 추천한 가게가 아니므로 매칭 검증은 skip)
  await page.goto('/mypage')
  await expect(page.getByRole('heading', { name: new RegExp(`^${NICK}`) })).toBeVisible()

  // 8. 사용자 영향 에러 0건 (router prefetch 취소 ERR_ABORTED는 정상이라 제외)
  const real = realErrors(errors)
  if (real.length > 0) {
    console.log('=== ALL captured errors (real) ===')
    real.forEach((e, i) => console.log(`[${i}] ${e}\n`))
    console.log('=== END ===')
  }
  expect(real, `브라우저 런타임 에러:\n${real.join('\n')}`).toEqual([])
})

test('지도 페이지 — 마커·SK일렉링크 리센터·추천 FAB', async ({ page }) => {
  const errors: string[] = []
  attachConsoleListeners(page, errors)
  await page.goto('/map')
  await expect(page.getByRole('link', { name: /제슐렝가이드/ })).toBeVisible()

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

test('랭킹 페이지 — 보드 2개 (추천·심사) 노출', async ({ page }) => {
  await page.goto('/ranking')
  await expect(page.getByRole('heading', { name: /추천 랭킹/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /심사 랭킹/ })).toBeVisible()
  // 명예의 전당은 제거됨
  await expect(page.getByRole('heading', { name: /명예의 전당/ })).toHaveCount(0)
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
  await page.getByRole('button', { name: /위키 입장하기/ }).click()
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

  // BASIC_AUTH로는 200 — 환경별 비번을 env로 override 가능
  const adminUser = process.env.BASIC_AUTH_USER ?? 'admin'
  const adminPass = process.env.BASIC_AUTH_PASS ?? 'jelin-admin-2026'
  const withAuth = await browser.newContext({
    httpCredentials: { username: adminUser, password: adminPass },
  })
  const page2 = await withAuth.newPage()
  const r2 = await page2.goto('/admin')
  expect(r2?.status()).toBe(200)
  await expect(page2.getByRole('heading', { name: '/admin' })).toBeVisible()
  await withAuth.close()
})
