import { z } from 'zod'

// 닉네임: 2~16자, 한글·영문·숫자·`_`. (P3 결정)
export const nicknameSchema = z
  .string()
  .min(2, '닉네임은 2자 이상이어야 합니다.')
  .max(16, '닉네임은 16자 이하여야 합니다.')
  .regex(/^[가-힣a-zA-Z0-9_]+$/, '한글·영문·숫자·_만 사용할 수 있습니다.')

// 비밀번호: 8자 이상.
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다.')
  .max(72, '비밀번호가 너무 깁니다.') // bcrypt 한계

export const signupSchema = z.object({
  nickname: nicknameSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  nickname: nicknameSchema,
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

export const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: passwordSchema,
})

export const changeNicknameSuffixSchema = z.object({
  baseNickname: nicknameSchema,
})

/**
 * 동명 신접 시 자동 접미사 후보 생성. 첫 번째 미사용 후보를 server에서 결정.
 * 시드 후보: nickname, nickname_2, nickname_3, ... nickname_99
 */
export function generateNicknameCandidates(base: string): string[] {
  const out = [base]
  for (let i = 2; i <= 99; i++) out.push(`${base}_${i}`)
  return out
}
