export type Platform = {
  isIOS: boolean
  isAndroid: boolean
  isKakao: boolean
  isStandalone: boolean
}

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return { isIOS: false, isAndroid: false, isKakao: false, isStandalone: false }
  }
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  const isAndroid = /Android/i.test(ua)
  const isKakao = /KAKAOTALK/i.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return { isIOS, isAndroid, isKakao, isStandalone }
}
