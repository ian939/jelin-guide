import { Header } from '@/components/Header'

type Entry = {
  date: string
  title: string
  items: string[]
}

// 새 업데이트는 배열 맨 앞에 추가.
const ENTRIES: Entry[] = [
  {
    date: '2026-04-28',
    title: '5가지 UX 개선',
    items: [
      '첫 화면을 지도 페이지로 변경',
      '/map 에 [점심][회식][기타] 탭 추가, 지도 영역 축소',
      '닉네임 옆에 메뉴(프로필 설정·업데이트 내역) 추가',
      '맛집 추천 시 평점·키워드 함께 입력',
      '리뷰 별점 5점은 빨간색으로 강조 (정말 좋을 때)',
    ],
  },
  {
    date: '2026-04-28',
    title: 'mealType + 랭킹 2×1 + 제안 FAB',
    items: [
      '점심·회식·기타 분류 도입',
      '랭킹 보드를 추천·심사 두 개로 정리, 한눈에 보이는 grid',
      '우측 하단 💡 제안하기 — 자유 의견을 운영자에게 전달 (Apps Script)',
      '지도 마커 클릭 시 floating card로 가게 정보 표시',
      '필터: 리뷰 많은 순 / 평점 높은 순 추가',
      '지도 첫 화면 zoom 100m로 가까이',
      '콜드 스타트 체감 개선 (skeleton)',
    ],
  },
  {
    date: '2026-04-28',
    title: '주소 → 가게 이름 검색 + 미니맵',
    items: [
      '주소 입력 대신 가게 이름으로 검색 (카카오 Local API)',
      '검색 결과 클릭으로 상호·주소·좌표·카테고리 자동 채움',
      '추천 폼에 위치 확인용 미니맵 노출',
    ],
  },
  {
    date: '2026-04-28',
    title: '추천이유 / 식당 마커 / 네이버지도 / 등록 토스트 / 관리자 삭제',
    items: [
      '추천이유 (선택) 입력 칸 추가',
      '지도 마커를 식당 아이콘으로',
      '가맹점 상세에 네이버지도 외부 링크',
      '추천·리뷰 등록 후 감사 토스트',
      '/admin 에서 가맹점 삭제 권한',
    ],
  },
  {
    date: '2026-04-28',
    title: 'SK일렉링크 핀 / 워딩 정리',
    items: [
      '논현동 SK일렉링크 본사에 그라데이션 SK 핀',
      '지도 우상단 [SK일렉링크] 버튼으로 본사 위치 복귀',
      '"가맹점 제안" → "맛집 추천하기" 워딩 일괄 변경',
    ],
  },
  {
    date: '2026-04-28',
    title: 'MVP 1차 출시',
    items: [
      '제로페이 가맹 맛집을 동료가 직접 추천·평가하는 사내 가이드',
      '익명 닉네임 가입, 카카오 가게 검색, 3차원 5점 리뷰',
      '위키식 정보 수정·롤백, 신고 자동 숨김',
    ],
  },
]

export default function UpdatesPage() {
  return (
    <>
      <Header title="업데이트 내역" back="/map" />
      <main className="px-5 pb-12">
        <p className="mt-4 mb-6 text-sm text-zinc-600">
          제슐렝가이드의 변경 사항입니다. 의견은 우측 하단 <strong>💡 제안하기</strong>로 보내주세요.
        </p>
        <ol className="space-y-6">
          {ENTRIES.map((e, i) => (
            <li key={i} className="card">
              <p className="text-xs text-zinc-500">{e.date}</p>
              <h3 className="mt-1 text-base font-bold">{e.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-700">
                {e.items.map((s, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="shrink-0 text-accent">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </main>
    </>
  )
}
