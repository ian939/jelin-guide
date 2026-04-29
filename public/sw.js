// 학동위키 PWA service worker
// - HTML/RSC payload·API 응답은 캐시 안 함 (실시간 데이터 보장)
// - /_next/static/*·아이콘·이미지·폰트만 stale-while-revalidate
// - 캐시 버전(jakdong-static-v1) 변경 시 모든 이전 캐시 자동 정리

const CACHE = 'jakdong-static-v1'
const STATIC = [
  '/logo.png',
  '/icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  if (!isStatic) return

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      const networkPromise = fetch(request)
        .then(res => {
          if (res.ok) cache.put(request, res.clone()).catch(() => {})
          return res
        })
        .catch(() => cached)
      return cached || networkPromise
    })
  )
})
