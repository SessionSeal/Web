/**
 * Auth.js (next-auth v5) — Google sign-in, JWT session strategy.
 *
 * No adapter, no Auth.js tables: the `jwt` callback upserts into OUR
 * `users` + `auth_identities` on first sign-in (via the `web` Postgres
 * role, which can touch only those two tables), and our user id rides
 * in the token as `uid`. Heimdall independently verifies the session
 * cookie with the shared AUTH_SECRET — keep @auth/core versions in
 * lockstep between Web and Heimdall.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const u = await client.query(
            `insert into users (email, name, avatar_url, last_login_at, signup_source)
             values ($1, $2, $3, now(), 'WEB')
             on conflict (email) do update
               set name = coalesce(excluded.name, users.name),
                   avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
                   last_login_at = now()
             returning id`,
            [profile.email, profile.name ?? null, profile.picture ?? null]);
          await client.query(
            `insert into auth_identities
               (user_id, provider, provider_id, email, profile, last_used_at)
             values ($1, 'GOOGLE', $2, $3, $4, now())
             on conflict (provider, provider_id) do update
               set last_used_at = now(), email = excluded.email`,
            [u.rows[0].id, account.providerAccountId, profile.email,
             JSON.stringify(profile)]);
          await client.query("commit");
          token.uid = u.rows[0].id;
        } catch (e) {
          await client.query("rollback");
          throw e;
        } finally {
          client.release();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
