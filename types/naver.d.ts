// 네이버 지도 SDK는 글로벌 `window.naver`로 노출된다.
// MVP에선 정밀한 타이핑보다 any 사용으로 간소화한다.
declare global {
  interface Window {
    naver: any
  }
}
export {}
