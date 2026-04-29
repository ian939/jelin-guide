# 학동위키 (제슐렝가이드)

SK일렉링크 임직원이 학동 인근 제로페이 가맹 맛집을 동료끼리 추천·평가하는 사내 위키 가이드.

## 스택

- Next.js 14 App Router + TypeScript
- Prisma + Neon Postgres (pooled + direct URL)
- NextAuth v4 Credentials Provider (JWT 전략 — DB session 미사용)
- Tailwind CSS
- Naver Maps SDK + Geocoding API (키 분리: SDK용 / Geocoding용)
- Kakao Local 키워드 검색 API
- Playwright E2E (Pixel 7 viewport) + Vitest 단위
- Netlify 배포 + Apps Script webhook (제안 기능)

## 운영 정책

### 업데이트 내역 (`app/updates/page.tsx`)

`ENTRIES` 배열은 운영자가 **명시적으로 "업데이트 내역으로 추가해줘"** 라고 요청한 변경에 한해서만 추가한다.

- 일반적인 코드 수정·기능 추가·버그 수정으로는 자동으로 기록하지 않는다.
- 운영자 명시 요청이 있을 때만 새 엔트리를 배열 **맨 앞**에 추가한다 (최신순).
- 엔트리 형식: `{ date: 'YYYY-MM-DD', title: string, items: string[] }`
- 사용자에게 보여줄 사람 친화적인 문장으로 작성 (개발자 jargon 금지).

**Why**: 운영자가 변경 사항 중 사용자에게 알릴 가치가 있는 것만 골라 노출하고 싶어함. 모든 커밋이 업데이트 내역에 들어가면 노이즈가 됨.

## 테스트 데이터 정리

E2E는 production DB를 공유하므로 `e2e/global-teardown.ts`가 `e2e_*` / `editor_*` 닉네임 사용자와 그들이 만든 데이터를 FK 순서대로 삭제한다. E2E로 인해 production에 잔여 가게가 누적되지 않도록 유지.

## 환경변수

- `DATABASE_URL` (pooled) / `DIRECT_URL` (migrate용)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` (SDK 전용 키)
- `NAVER_GEOCODING_CLIENT_ID` / `NAVER_GEOCODING_CLIENT_SECRET` (Geocoding API용 — SDK와 다른 키)
- `KAKAO_REST_API_KEY` (Local 키워드 검색)
- `PROPOSAL_WEBHOOK_URL` (Apps Script Web App)
- `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (`/admin` 보호)

## 자주 쓰는 명령

```bash
pnpm dev              # 로컬 개발
pnpm typecheck        # 타입 체크
pnpm test             # Vitest 단위
pnpm e2e              # Playwright E2E
pnpm prisma migrate dev  # 마이그레이션
```
