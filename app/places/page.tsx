import { redirect } from 'next/navigation'

// /places 리스트 화면은 더 이상 사용하지 않음 — 진입 시 /map 으로 바로 이동.
export default function PlacesPage() {
  redirect('/map')
}
