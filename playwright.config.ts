import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'accept-language': 'ko-KR,ko' },
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        // 우리는 미니멀 모바일 우선이므로 Pixel 7 (412×915) 가 P5 360~430px 대상에 해당
      },
    },
  ],
})
