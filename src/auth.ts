import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered:', { user, account, profile });

      if (!user.email) {
        console.error('No email provided');
        return false;
      }

      try {
        console.log('Checking if user exists:', user.email);

        // Check if user exists
        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${user.email}
        `;

        console.log('Existing user result:', existingUser);

        if (existingUser.length === 0) {
          console.log('Creating new user');
          // Create new user
          const userId = crypto.randomUUID();
          await sql`
            INSERT INTO users (id, email, name, image)
            VALUES (${userId}, ${user.email}, ${user.name || ''}, ${user.image || ''})
          `;

          // Create default page for new user
          const pageId = crypto.randomUUID();
          await sql`
            INSERT INTO pages (id, user_id, name)
            VALUES (${pageId}, ${userId}, ${'Main Page'})
          `;
          console.log('User and default page created successfully');
        } else {
          console.log('Updating existing user');
          // Update existing user info
          await sql`
            UPDATE users
            SET name = ${user.name || ''}, image = ${user.image || ''}, updated_at = NOW()
            WHERE email = ${user.email}
          `;
          console.log('User updated successfully');
        }

        console.log('SignIn successful');
        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Error stack:', error instanceof Error ? error.stack : '');
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Get user ID from database
        const result = await sql`
          SELECT id FROM users WHERE email = ${session.user.email!}
        `;

        if (result.length > 0) {
          session.user.id = result[0].id as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});
