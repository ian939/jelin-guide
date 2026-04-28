import type { Place } from '@prisma/client'
import { prisma } from '@/lib/db'

// 두 좌표 사이 거리(미터) — Haversine 공식.
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const c = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(c))
}

// Levenshtein 기반 정규화 유사도 (0~1).
export function nameSimilarity(a: string, b: string) {
  const x = a.replace(/\s+/g, '').toLowerCase()
  const y = b.replace(/\s+/g, '').toLowerCase()
  if (!x.length && !y.length) return 1
  const m = x.length
  const n = y.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  const dist = dp[m][n]
  return 1 - dist / Math.max(m, n)
}

// 중복 가맹점 자동 차단 임계값.
const DUP_RADIUS_M = 50
const DUP_NAME_SIM = 0.8

/**
 * 등록 시점에 중복 가맹점을 탐지한다. 좌표 50m 이내 + 상호 유사도 ≥ 0.8 이면 차단.
 * 후보가 있으면 첫 번째를 반환, 없으면 null.
 */
export async function findDuplicatePlace(input: {
  name: string
  lat: number
  lng: number
}): Promise<Place | null> {
  // bbox prefilter (대략 100m × 100m). 좌표 1도 ≈ 111km, 100m ≈ 0.0009도.
  const dLat = 0.001
  const dLng = 0.001
  const candidates = await prisma.place.findMany({
    where: {
      isHidden: false,
      lat: { gte: input.lat - dLat, lte: input.lat + dLat },
      lng: { gte: input.lng - dLng, lte: input.lng + dLng },
    },
    take: 30,
  })
  for (const c of candidates) {
    const m = haversineMeters({ lat: c.lat, lng: c.lng }, input)
    if (m > DUP_RADIUS_M) continue
    if (nameSimilarity(c.name, input.name) >= DUP_NAME_SIM) return c
  }
  return null
}
