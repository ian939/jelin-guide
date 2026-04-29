import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '학동위키',
    short_name: '학동위키',
    description: 'SK일렉링크 동료가 함께 만드는 학동 인근 제로페이 가맹 맛집 가이드',
    start_url: '/map',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1F6BFF',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
