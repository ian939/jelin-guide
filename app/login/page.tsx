import { redirect } from 'next/navigation'

// 로그인 페이지는 /signup 으로 일원화한다.
// 정책: 첫 진입자가 절대다수, 로그아웃은 거의 안 함 → 분리된 로그인 페이지의 효용이 없음.
// 같은 폼에서 가입 + 재진입 모두 처리.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string }
}) {
  const cb = searchParams.callbackUrl
  redirect(cb ? `/signup?callbackUrl=${encodeURIComponent(cb)}` : '/signup')
}
