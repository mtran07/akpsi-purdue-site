import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findMember } from "@/lib/portal-data";

/*
  Sign-in for the member portal: "Sign in with Google", allowed only for
  emails on the Members tab of the portal Google Sheet.

  Environment variables (set in Vercel → Settings → Environment Variables):
    AUTH_SECRET          random string that encrypts the session cookie
    AUTH_GOOGLE_ID       Google OAuth client ID
    AUTH_GOOGLE_SECRET   Google OAuth client secret
  Setup steps: docs/portal-setup.md
*/

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
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

      try {
        return (await findMember(profile.email)) !== null;
      } catch (error) {
        // If the sheet can't be reached, fail closed: nobody gets in.
        console.error("Member check failed during sign-in", error);
        return false;
      }
    },
  },
});
