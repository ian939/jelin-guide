// 학동위키 PWA — installable 조건 충족용 minimal service worker.
// 캐싱 안 함. fetch는 그냥 통과. 향후 SW 제거 시 cleanup SW 필요.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
