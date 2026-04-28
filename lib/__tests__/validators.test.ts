import { describe, expect, it } from 'vitest'
import { generateNicknameCandidates, nicknameSchema, passwordSchema } from '@/lib/validators/user'
import { reviewSubmitSchema } from '@/lib/validators/review'
import { placeSubmitSchema } from '@/lib/validators/place'
import { haversineMeters, nameSimilarity } from '@/lib/places'

describe('user validators', () => {
  it('accepts valid nickname (한글·영문·숫자·_)', () => {
    expect(nicknameSchema.safeParse('구아저씨').success).toBe(true)
    expect(nicknameSchema.safeParse('foo_2').success).toBe(true)
  })
  it('rejects too short / too long / disallowed chars', () => {
    expect(nicknameSchema.safeParse('a').success).toBe(false)
    expect(nicknameSchema.safeParse('a'.repeat(17)).success).toBe(false)
    expect(nicknameSchema.safeParse('hello world').success).toBe(false)
    expect(nicknameSchema.safeParse('한글-영문').success).toBe(false)
  })
  it('password requires 8+ chars', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false)
    expect(passwordSchema.safeParse('12345678').success).toBe(true)
  })
  it('generates candidates in order', () => {
    const out = generateNicknameCandidates('구아저씨')
    expect(out[0]).toBe('구아저씨')
    expect(out[1]).toBe('구아저씨_2')
    expect(out.length).toBe(99)
  })
})

describe('review validator', () => {
  it('requires 3 scores 1~5 and 10~1000자 body', () => {
    expect(
      reviewSubmitSchema.safeParse({
        scoreTaste: 5,
        scoreValue: 4,
        scoreAtmosphere: 3,
        body: '짧음',
      }).success
    ).toBe(false)
    expect(
      reviewSubmitSchema.safeParse({
        scoreTaste: 0,
        scoreValue: 4,
        scoreAtmosphere: 3,
        body: '열글자이상의 본문입니다.',
      }).success
    ).toBe(false)
    expect(
      reviewSubmitSchema.safeParse({
        scoreTaste: 5,
        scoreValue: 4,
        scoreAtmosphere: 3,
        body: '열글자이상의 본문입니다.',
      }).success
    ).toBe(true)
  })
})

describe('place validator', () => {
  it('rejects unknown category', () => {
    expect(
      placeSubmitSchema.safeParse({
        name: '가게',
        address: '서울 어딘가',
        category: 'NOPE',
        zeropaySelfReport: true,
      }).success
    ).toBe(false)
  })
  it('accepts minimal valid payload', () => {
    expect(
      placeSubmitSchema.safeParse({
        name: '가게',
        address: '서울시 어딘가',
        category: 'KOREAN',
        zeropaySelfReport: true,
      }).success
    ).toBe(true)
  })
})

describe('haversineMeters', () => {
  it('서울 시청 ↔ 광화문 약 600m 이내', () => {
    const a = { lat: 37.5665, lng: 126.978 }
    const b = { lat: 37.5759, lng: 126.9769 } // 광화문 근처
    const d = haversineMeters(a, b)
    expect(d).toBeGreaterThan(900)
    expect(d).toBeLessThan(1300)
  })
})

describe('nameSimilarity', () => {
  it('동일 문자열 → 1', () => {
    expect(nameSimilarity('구아저씨네', '구아저씨네')).toBe(1)
  })
  it('공백 무시', () => {
    expect(nameSimilarity('아 저 씨', '아저씨')).toBe(1)
  })
  it('완전히 다른 이름은 낮은 유사도', () => {
    expect(nameSimilarity('피자스쿨', '구아저씨네')).toBeLessThan(0.5)
  })
  it('한 글자 차이는 임계 0.8 이상', () => {
    expect(nameSimilarity('구아저씨네', '구아저씨내')).toBeGreaterThanOrEqual(0.8)
  })
})
