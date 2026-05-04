/**
 * "서울특별시 강남구 논현동 85-9" 의 실제 좌표를 Naver Geocoding API로 확인.
 * 실행: pnpm tsx scripts/_geocode-check.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// 간단 .env 파서
for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/)
  if (m) process.env[m[1]] = m[2]
}

async function main() {
  const id = process.env.NAVER_GEOCODING_CLIENT_ID
  const secret = process.env.NAVER_GEOCODING_CLIENT_SECRET
  if (!id || !secret) {
    console.error('NAVER_GEOCODING_CLIENT_ID/SECRET 누락')
    process.exit(1)
  }
  const queries = [
    '서울특별시 강남구 논현동 83-15',
    '서울 강남구 논현동 83-15',
    '강남구 논현동 83-15',
  ]
  for (const q of queries) {
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': id,
        'x-ncp-apigw-api-key': secret,
      },
    })
    const json = (await res.json()) as any
    console.log(`\nquery: ${q}`)
    console.log(`status: ${res.status} count: ${json.addresses?.length ?? 0}`)
    for (const a of (json.addresses || []).slice(0, 3)) {
      console.log(`  lat=${a.y} lng=${a.x}`)
      console.log(`    road: ${a.roadAddress}`)
      console.log(`    jibun: ${a.jibunAddress}`)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
