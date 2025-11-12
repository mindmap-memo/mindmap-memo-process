import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // state 파라미터를 명시적으로 포함
          state: true
        }
      },
      // 모바일 User-Agent 허용 설정
      allowDangerousEmailAccountLinking: true,
      // 체크 옵션 추가 (state 쿠키 검증 완화)
      checks: ['state'],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  // 환경에 따라 자동으로 URL 설정
  ...(process.env.NEXTAUTH_URL && {
    url: process.env.NEXTAUTH_URL
  }),
  // 모바일 환경을 위한 설정
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
  cookies: {
    sessionToken: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 60 * 15 // 15 minutes
      }
    },
    csrfToken: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 60 * 15 // 15 minutes
      }
    },
    pkceCodeVerifier: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 60 * 15 // 15 minutes
      }
    },
    state: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 60 * 15 // 15 minutes
      }
    },
    nonce: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        maxAge: 60 * 15 // 15 minutes
      }
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      // If no database connection, allow sign in without storing user data
      if (!sql) {
        console.warn('[NextAuth] No database connection, skipping user storage');
        return true;
      }

      try {
        // Check if user exists
        const existingUser = await sql`
          SELECT * FROM users WHERE email = ${user.email}
        `;

        if (existingUser.length === 0) {
          // Create new user
          await sql`
            INSERT INTO users (id, email, name, image)
            VALUES (${user.id}, ${user.email}, ${user.name}, ${user.image})
          `;
        } else {
          // Update user info
          await sql`
            UPDATE users
            SET name = ${user.name}, image = ${user.image}, updated_at = NOW()
            WHERE email = ${user.email}
          `;
        }

        return true;
      } catch (error) {
        console.error('[NextAuth] Sign in error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Get user_id from database based on email
        if (sql) {
          try {
            const result = await sql`
              SELECT id FROM users WHERE email = ${session.user.email}
            `;

            if (result.length > 0) {
              session.user.id = result[0].id;
            }
          } catch (error) {
            console.error('[NextAuth] Session callback error:', error);
          }
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // 디버그 모드 활성화 (개발 환경에서만)
  debug: process.env.NODE_ENV === 'development',
  // 세션 전략 명시
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // 에러 로깅 강화
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warn]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    },
  },
};
