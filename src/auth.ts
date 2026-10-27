import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/*
  Sign-in for the member portal: "Sign in with Google". Access to anything
  brother-only is decided per request by the Members tab (src/lib/dal.ts).

  Environment variables (set in Vercel → Settings → Environment Variables):
    AUTH_SECRET          random string that encrypts the session cookie
    AUTH_GOOGLE_ID       Google OAuth client ID
    AUTH_GOOGLE_SECRET   Google OAuth client secret
  Setup steps: docs/portal-setup.md
*/

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
      // checks the Members tab on each request. Someone who isn't on it sees
      // only the request-access form.
      return true;
    },
  },
});
