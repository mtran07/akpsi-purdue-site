import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findMember } from "@/lib/portal-data";

/*
  Sign-in for the member portal: "Sign in with Google". Access to anything
  brother-only is decided by the Members tab (src/lib/dal.ts).

  Speed: asking the sheet "is this a member?" takes a second or more, so the
  answer is kept in the signed session cookie and re-checked every few
  minutes (src/proxy.ts refreshes it on portal requests). Removing someone
  from the Members tab takes effect within MEMBER_RECHECK_MS.

  Environment variables (set in Vercel → Settings → Environment Variables):
    AUTH_SECRET          random string that encrypts the session cookie
    AUTH_GOOGLE_ID       Google OAuth client ID
    AUTH_GOOGLE_SECRET   Google OAuth client secret
  Setup steps: docs/portal-setup.md
*/

const MEMBER_RECHECK_MS = 5 * 60_000;
const NON_MEMBER_RECHECK_MS = 30_000;
const MEMBER_GRACE_MS = 30 * 60_000;

declare module "next-auth" {
  interface Session {
    /** Set when the Members tab lists this email as active (re-checked every few minutes). */
    member: { name: string } | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // Always show Google's account chooser, so someone who signed in with
      // the wrong account can pick a different one after signing out.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // a week, then sign in again
  },
  pages: {
    // Both land back on the portal page, which shows the right message.
    signIn: "/portal",
    error: "/portal",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      if (!profile?.email || profile.email_verified !== true) return false;

      // Any verified Google account may sign in. Being signed in grants nothing:
      // every brother-only page and action goes through src/lib/dal.ts, which
      // requires session.member (set below from the Members tab). Someone who
      // isn't on it sees only the request-access form.
      return true;
    },

    async jwt({ token, trigger }) {
      const now = Date.now();
      const checkedAt = typeof token.memberCheckedAt === "number" ? token.memberCheckedAt : 0;
      // Non-members are re-checked sooner, so an approved request works quickly.
      const recheck = token.member ? MEMBER_RECHECK_MS : NON_MEMBER_RECHECK_MS;
      if (trigger !== "signIn" && now - checkedAt < recheck) return token;
      if (!token.email) return token;

      try {
        const member = await findMember(token.email);
        token.member = member ? { name: member.name ?? "" } : null;
        token.memberCheckedAt = now;
      } catch (error) {
        // Sheet unreachable: keep a recent "yes" for a while, otherwise fail closed.
        console.error("Member check failed", error);
        if (!checkedAt || now - checkedAt > MEMBER_GRACE_MS) token.member = null;
      }
      return token;
    },

    async session({ session, token }) {
      session.member = (token.member as { name: string } | null | undefined) ?? null;
      return session;
    },
  },
});
