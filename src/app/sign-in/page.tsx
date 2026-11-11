import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signInWithGoogle } from "@/app/portal/actions";
import { getViewer } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";
import chapterPhoto from "../../../public/images/chapter/pi-omega-chapter.jpg";
import site from "@/data/site.json";

export const metadata: Metadata = {
  title: "Sign in to the member portal",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  AccessDenied:
    "That Google account couldn't be used. Sign in with a verified Google account, like your personal Gmail.",
  Configuration: "Sign-in isn't working right now. Let the Technology Committee know.",
};

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <div className="grid min-h-dvh bg-navy-deep lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Chapter side (desktop) */}
      <div className="relative hidden flex-col justify-center gap-10 overflow-hidden bg-navy p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-gold/10" />
        <div>
          <p className="font-display text-5xl font-bold text-gold">{site.chapterShort}</p>
          <p className="mt-4 max-w-md font-display text-3xl font-bold leading-tight">Pi Omega brother portal</p>
        </div>
        <Image
          src={chapterPhoto}
          alt="Pi Omega brothers"
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          placeholder="blur"
          className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
        />
        <ul className="grid gap-3 text-sm text-white/80 xl:grid-cols-3">
          {["Brother and alumni directories", "Your points, attendance and excusals", "Chapter check-in and events"].map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="text-gold">✦</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Sign-in side */}
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 self-start text-sm font-medium text-white/75 hover:text-gold">
          <span aria-hidden>←</span> Back to akpsipurdue.com
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div className="text-center lg:hidden">
              <p className="font-display text-4xl font-bold text-gold">{site.chapterShort}</p>
              <p className="mt-2 text-sm font-medium tracking-wide text-white/80">Purdue · Pi Omega</p>
            </div>
            <div className="mt-8 rounded-2xl bg-white p-8 shadow-2xl lg:mt-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Brothers only</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-navy">Member portal</h1>
              <Suspense fallback={<div className="mt-6 h-32 animate-pulse rounded-xl bg-paper-alt" />}>
                <SignInForm searchParams={props.searchParams} />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-xs text-white/60">
              New brother or can&apos;t get in? Sign in anyway and request access, or ask the VP of Membership.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function SignInForm({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  if (!isPortalConfigured()) {
    return <p className="mt-4 text-muted">The portal isn&apos;t switched on yet. Check back soon.</p>;
  }

  // Already signed in: straight to the portal.
  const viewer = await getViewer();
  if (viewer.status !== "signed-out") redirect("/portal");

  const error = one(params.error);
  const notice = error
    ? { tone: "error" as const, text: ERRORS[error] ?? "Sign-in didn't work. Please try again." }
    : one(params.signedOut)
      ? { tone: "info" as const, text: "You're signed out." }
      : null;

  return (
    <>
      <p className="mt-2 text-sm text-muted">
        Use your personal Gmail. Purdue email accounts usually aren&apos;t Google accounts.
      </p>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-red-50 text-red-800" : "bg-gold-soft text-navy"}`}
        >
          {notice.text}
        </p>
      )}
      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={one(params.next) ?? "/portal"} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
        >
          <GoogleMark />
          Sign in with Google
        </button>
      </form>
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5 rounded-full bg-white p-0.5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
