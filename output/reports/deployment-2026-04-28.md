# 배포 보고서 — 2026-04-28 (P9 산출물 템플릿)

> 본 문서는 P9 종료 시 운영자가 채워서 sign-off하는 템플릿이다.
> 초안은 Claude Code가 작성하며, 실제 배포 URL·환경변수 점검·스모크 결과는 운영자가 마지막 게이트에서 기록한다.

## 1. 배포 메타

- 환경: Production (Netlify)
- 도메인: _<설정 후 기록>_
- 빌드 SHA: _<git rev-parse HEAD>_
- 빌드 시각 (KST): _<채움>_
- 배포자: 운영자 1인

## 2. 환경변수 점검

| 키 | 설정 여부 | 비고 |
|---|---|---|
| `DATABASE_URL` | _[ ]_ | Neon production 브랜치 |
| `NEXTAUTH_SECRET` | _[ ]_ | `openssl rand -base64 32` 로 생성 |
| `NEXTAUTH_URL` | _[ ]_ | 운영 도메인 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | _[ ]_ | 클라이언트 SDK용 |
| `NAVER_GEOCODING_CLIENT_ID` | _[ ]_ | 서버 전용 |
| `NAVER_GEOCODING_CLIENT_SECRET` | _[ ]_ | 서버 전용 |
| `BASIC_AUTH_USER` | _[ ]_ | /admin 보호 |
| `BASIC_AUTH_PASS` | _[ ]_ | 강한 비밀번호 |
| `SENTRY_DSN` | _[ ]_ | 선택 |

## 3. 사전 작업 체크리스트

- [ ] `pnpm build` 로컬 통과
- [ ] `pnpm lint` 무경고
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과 (validators, ranking)
- [ ] Prisma 마이그레이션 production 브랜치에 적용됨
- [ ] Netlify 환경변수 등록 (위 표 모두 ✓)
- [ ] 시드 가맹점 5~10개 등록 (운영자 식별 닉)

## 4. 스모크 테스트 (P9 결정값)

본 시나리오는 프로덕션에서 모두 통과해야 한다.

- [ ] 비회원으로 진입 → 홈·리스트·지도·랭킹 열람
- [ ] 가입 → 자동 로그인
- [ ] 가맹점 제안 (Geocoding 정상 작동, 좌표 변환 확인)
- [ ] 가맹점 상세 → 리뷰 작성 (3차원 5점)
- [ ] 카테고리 칩 + 필터 Bottom Sheet 적용
- [ ] 지도 페이지 마커 확인, 마커 클릭 시 리스트 스크롤
- [ ] 마이페이지 → 내 제안·리뷰·랭킹 위치 노출
- [ ] 가맹점 정보 수정 → 이력에 새 리비전 추가 → 롤백 동작 확인
- [ ] 신고 3건 누적 → 자동 숨김 → /admin 복원
- [ ] 탈퇴 → 닉네임 잔존 확인 → 재로그인 시도 → 차단

## 5. 알려진 제약 (의도)

- 비밀번호 복구 수단 없음 — 가입 화면에 명시.
- 어뷰징 자동 제한 / LLM 모더레이션 없음.
- 사진 업로드 / PWA / 알림 / OG 카드 없음.
- 다국어 미지원 (한국어 전용).
- 데스크톱은 태블릿(768px)까지 편안, 그 이상은 중앙 정렬 모바일 레이아웃.

## 6. 모니터링

- Sentry: _<프로젝트 URL>_
- Netlify Analytics: _<프로젝트 URL>_
- 첫 24시간 내 Sentry에 1건 이상 캡처 확인 (테스트 에러로) — _[ ] 확인됨_

## 7. 롤백 절차

- 즉시 롤백: Netlify 이전 배포로 원클릭 복귀.
- DB 마이그레이션은 forward-only (Prisma) — 데이터 손실 위험 변경은 두 단계 배포로 진행.

## 8. Sign-off

- 배포자: ____________________
- 일시 (KST): ____________________
- 결정: [ ] Pass / [ ] 부분 보류 / [ ] 롤백
