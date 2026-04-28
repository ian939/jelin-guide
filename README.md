# 제슐렝가이드

> 제로페이 가맹 맛집을 동료가 직접 추천·평가하는 모바일 웹 가이드 (사내 파일럿).

[설계서](./jelin-guide-agent-design.md) · [요구사항](./output/specs/requirements.md) · [데이터 모델](./output/specs/data-model.md) · [랭킹 공식](./output/specs/ranking-formula.md)

## 기술 스택

- Next.js 14 (App Router) — 풀스택
- Prisma + Neon Postgres — 프로덕션·로컬 모두 Neon (브랜치로 분기)
- NextAuth v4 (Credentials + DB 세션)
- Tailwind CSS — 미니멀 토스 톤
- 네이버 지도 SDK + Geocoding API (서버 프록시)
- Netlify 배포

## 시작하기

### 1. 환경변수

`.env.example`을 `.env.local`로 복사하고 채운다.

```bash
cp .env.example .env.local
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. DB 마이그레이션

```bash
pnpm db:migrate
```

### 4. 개발 서버

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 진입.

## 주요 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | Prisma generate + Next 빌드 |
| `pnpm typecheck` | TypeScript 타입 체크 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (단위) |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:deploy` | Prisma migrate deploy (프로덕션) |
| `pnpm db:studio` | Prisma Studio |

## 폴더 구조 (요약)

```
/app                 # App Router
  /api               # Route Handlers (places, reviews, reports, votes, admin, ...)
  /places            # 리스트·상세·제안·수정·이력
  /map, /ranking, /mypage, /admin, /login, /signup
/components          # UI 컴포넌트
/lib                 # 도메인 로직 + 검증
  /validators        # Zod 스키마
/prisma              # schema.prisma
/output              # 명세·검증 리포트
/types               # 모듈 보강 타입 (NextAuth, naver SDK)
```

## /admin

- 환경변수 `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` 의 Basic Auth 1단계 보호.
- 신고 대시보드, 탈퇴 처리됨 목록, 복원·삭제 처리.

## 배포 (Netlify)

1. 레포지토리를 Netlify에 연결한다.
2. 위 환경변수를 모두 등록한다.
3. `netlify.toml`이 빌드를 자동 처리한다 (`db:deploy && build`).

## 보안·운영 메모

- 비밀번호 복구 수단 없음 (의도적). 가입 화면에 명시되어 있다.
- /admin은 Basic Auth 1단계 — 실서비스 확장 시 정식 권한 모델로 교체.
- 어뷰징 자동 제한·LLM 모더레이션은 미적용. 사내 파일럿 가정.
- 신고 임계 N=3 자동 숨김 (`lib/validators/report.ts`).
- 가맹점 중복 차단 임계: 좌표 50m + 상호 levenshtein 유사도 ≥ 0.8 (`lib/places.ts`).

## 시드 데이터 주입 절차 (P9 직전)

운영자가 식별 닉(예: `제슐렝가이드_운영팀`)으로 5~10개를 일반 제안 흐름으로 등록한다.
부트스트랩 모드(가맹점 < 5건 또는 리뷰 < 10건)는 시드 후 자동 해제된다.
