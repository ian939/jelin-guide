import './globals.css'
import type { Metadata } from 'next'
import { FlashToast } from '@/components/FlashToast'
import Providers from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: '제슐렝가이드',
  description: '제로페이 가맹 맛집을 동료가 직접 추천·평가하는 가이드',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
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
        </Providers>
      </body>
    </html>
  )
}
