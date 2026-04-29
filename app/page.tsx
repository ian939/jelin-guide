import { redirect } from 'next/navigation'

// 첫 화면은 지도. 부트스트랩(가게 < 5)일 때도 /map 자체가 빈 지도 + FAB로 유도.
export default function HomePage() {
  redirect('/map')
}
