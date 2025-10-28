import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
