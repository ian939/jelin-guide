# 랭킹 공식 (P7)

> [requirements.md F7](./requirements.md#f7-랭킹) · 설계서 §6.6 의 결정값을 코드로 옮긴 정식 명세.
> 구현체: [`/lib/ranking.ts`](../../lib/ranking.ts)

## 보드

| 보드 | 의미 | 산식 | 정렬 |
|---|---|---|---|
| 이달의 심사위원 | 이번 달 활성 리뷰 수 | `count(Review WHERE isHidden=false AND createdAt ≥ KST 이달 1일 00:00)` | 내림차순, 동률 시 PK 미보정 |
| 명예의 전당 | 누적 활성 리뷰 수 | `count(Review WHERE isHidden=false)` | 내림차순 |
| 제안 랭킹 | 누적 활성 가맹점 수 | `count(Place WHERE isHidden=false)` group by createdById | 내림차순 |

## 시간 윈도우

- KST(UTC+9) 기준 매월 1일 00:00을 윈도우 시작으로 한다.
- 윈도우 종료는 별도 두지 않음 (`>= start`).
- 매일 자정 KST에 자연스럽게 갱신 (캐시 만료가 5분이므로 자정 직후 5분 안에 새 윈도우로 갱신).

## 가중치

MVP에선 **가중치 없음 — 단순 카운트**. 차원별 표준편차·디케이는 적용하지 않는다.
설계서 §6.6의 미해결 사항이며, 베타 운영 데이터 확보 후 P7 개선 단계에서 재검토.

## 캐싱

- in-memory `Map`, TTL **5분**.
- 키: `monthly` / `hall` / `proposal`.
- 인스턴스 재시작·서버리스 콜드 스타트마다 초기화됨 — 부하상 무관(쿼리 비용 작음).
- 분산·부하가 커지면 Redis로 이전.

## 결정성 (deterministic)

- 동일 입력(DB 상태)에 대해 항상 같은 정렬 결과 → 캐시 윈도우 안에서 동일.
- 동률 처리: 내부 정렬은 Postgres 기본(임의). 사용자 입장에서 동률 표시 보강은 후속 과제.

## 활성·비활성 규칙

- `Review.isHidden=true` 는 모든 보드에서 제외.
- `Place.isHidden=true` 는 제안 랭킹에서 제외.
- 작성자가 탈퇴(`User.deletedAt` set) 했어도 작성한 제안·리뷰는 잔존하므로 랭킹에 그대로 카운트된다 (설계서 §6.8과 일치).

## 갱신 트리거

- 별도 트리거 없음. 5분 TTL이 자연 갱신.
- 즉시성이 필요한 화면은 `?fresh=1` 같은 쿼리 파라미터로 캐시 무효화 가능 — 후속 과제.

## 단위 테스트

- `startOfMonthKST` — KST 기준 1일 00:00 환산이 DST 무관하게 정확한지.
- `enrich` — 닉네임 join 누락 시 `'익명'` 폴백.
- 자세한 테스트는 [`lib/__tests__/ranking.test.ts`](../../lib/__tests__/ranking.test.ts).
