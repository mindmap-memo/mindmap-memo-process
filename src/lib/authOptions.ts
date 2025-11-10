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
          response_type: "code"
        }
      },
      // 모바일 User-Agent 허용 설정
      allowDangerousEmailAccountLinking: true,
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
        secure: process.env.NEXTAUTH_URL?.startsWith('https://')
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
};
