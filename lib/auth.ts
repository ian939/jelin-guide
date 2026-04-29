import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import { loginSchema } from '@/lib/validators/user'

// 설계서 §6.2는 "Credentials + DB 세션"을 결정했으나 NextAuth v4는 Credentials Provider를
// JWT strategy로만 지원한다. 그래서 본 구현은 JWT strategy를 쓰되, 매 요청마다 jwt 콜백에서
// 사용자를 DB에서 다시 읽어 nickname·deletedAt을 갱신한다 — 탈퇴 즉시 무효화 효과 동등.
//
// PrismaAdapter는 Credentials + JWT 조합에서 사실상 미사용이며, Next.js 14의 RSC 컨텍스트와
// 충돌해 `headers() outside request scope` 런타임 에러를 일으키므로 미부착한다.
// (스키마의 Account/Session/VerificationToken은 향후 OAuth Provider 추가 시 재활용.)
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 }, // 30일
  pages: { signIn: '/signup' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        nickname: { label: 'nickname', type: 'text' },
        password: { label: 'password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw)
        if (!parsed.success) return null
        const { nickname, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { nickname } })
        if (!user || user.deletedAt) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return {
          id: user.id,
          name: user.nickname,
          email: user.email ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 최초 로그인 시 user가 채워져 들어온다
      if (user) {
        token.userId = (user as { id?: string }).id ?? token.sub ?? ''
      }
      // 매 요청마다 DB에서 활성 상태·닉네임을 재확인
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { nickname: true, deletedAt: true },
        })
        if (!dbUser || dbUser.deletedAt) {
          // 탈퇴자/삭제자: 토큰 무효화
          return {}
        }
        token.nickname = dbUser.nickname
      }
      return token
    },
    async session({ session, token }) {
      if (!token.userId) {
        // 무효 토큰: 빈 세션 반환
        return { ...session, user: undefined as never, expires: '0' }
      }
      session.user = {
        id: token.userId as string,
        nickname: (token.nickname as string) ?? null,
        name: (token.nickname as string) ?? null,
      }
      return session
    },
  },
}
