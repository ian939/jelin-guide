import './globals.css'
import type { Metadata, Viewport } from 'next'
import { FlashToast } from '@/components/FlashToast'
import { OnboardingDialog } from '@/components/OnboardingDialog'
import Providers from '@/components/SessionProvider'
import { SwRegister } from '@/components/SwRegister'

export const metadata: Metadata = {
  title: '학동위키',
  description: '제로페이 가맹 맛집을 동료가 직접 추천·평가하는 가이드',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '학동위키',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1F6BFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="bg-zinc-50 text-zinc-900 antialiased">
        <Providers>
          <div className="mx-auto min-h-screen max-w-mobile bg-white shadow-sm md:my-4 md:rounded-2xl md:shadow-lg">
            {children}
          </div>
          <FlashToast />
          <SwRegister />
          <OnboardingDialog />
        </Providers>
      </body>
    </html>
  )
}
