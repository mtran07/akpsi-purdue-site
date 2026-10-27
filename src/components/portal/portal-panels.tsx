import Link from "next/link";
import { signInWithGoogle, signOutOfPortal } from "@/app/portal/actions";
import type { Resource } from "@/lib/portal-types";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "That Google account isn't on the member list. Sign in with the email the chapter has on file, or ask the VP of Membership to add you.",
  Configuration: "Sign-in isn't working right now. Let the Technology Committee know.",
};

// After a sign-in from an email that isn't on the list yet (see src/auth.ts).
const ACCESS_MESSAGES: Record<string, { tone: "info" | "error"; text: string }> = {
  pending: {
    tone: "info",
    text: "We found your name on the chapter roster and sent your request to the officers. Once they approve it, sign in again with the same Google account.",
  },
  "no-match": {
    tone: "error",
    text: "That Google account isn't on the member list, and its name didn't match anyone on the roster. Try your personal Gmail, or make sure your Google account uses your full name.",
  },
  blocked: {
    tone: "error",
    text: "That account doesn't have portal access. If that's a mistake, contact the VP of Membership.",
  },
};

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="max-w-xl rounded-xl border border-line bg-white p-8">{children}</div>;
}

export function SignInPanel({ error, access }: { error?: string; access?: string }) {
  const notice = access
    ? ACCESS_MESSAGES[access]
    : error
      ? { tone: "error" as const, text: ERROR_MESSAGES[error] ?? "Sign-in didn't work. Please try again." }
      : null;

  return (
    <Card>
      <h2 className="font-display text-2xl font-bold text-navy">Brothers only</h2>
      <p className="mt-2 text-muted">
        Sign in to see brother resources and the alumni directory. Use your personal Gmail; Purdue email
        accounts usually aren&apos;t Google accounts.
      </p>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg p-3 text-sm ${
            notice.tone === "error" ? "bg-red-50 text-red-800" : "bg-gold-soft text-navy"
          }`}
        >
          {notice.text}
        </p>
      )}
      <form action={signInWithGoogle} className="mt-6">
        <button
          type="submit"
          className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          Sign in with Google
        </button>
      </form>
    </Card>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutOfPortal}>
      <button type="submit" className="text-sm font-medium text-navy underline underline-offset-4">
        Sign out
      </button>
    </form>
  );
}

export function NotMemberPanel({ email }: { email: string }) {
  return (
    <Card>
      <h2 className="font-display text-2xl font-bold text-navy">No access</h2>
      <p className="mt-2 text-muted">
        You&apos;re signed in as <span className="font-medium text-ink">{email}</span>, which isn&apos;t on the
        current member list. If that&apos;s a mistake, ask the VP of Membership to add you.
      </p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </Card>
  );
}

export function NotConfiguredPanel() {
  return (
    <Card>
      <h2 className="font-display text-2xl font-bold text-navy">Coming soon</h2>
      <p className="mt-2 text-muted">
        The member portal isn&apos;t switched on yet. Reach out to the Technology Committee for anything you
        need in the meantime.
      </p>
    </Card>
  );
}

export function ResourceList({ resources }: { resources: Resource[] | null }) {
  if (resources === null) {
    return <p className="text-muted">Resources couldn&apos;t load right now. Try again in a minute.</p>;
  }
  if (resources.length === 0) {
    return <p className="text-muted">No resources posted yet.</p>;
  }

  const groups = new Map<string, Resource[]>();
  for (const resource of resources) {
    const key = resource.category || "General";
    groups.set(key, [...(groups.get(key) ?? []), resource]);
  }

  return (
    <div className="space-y-8">
      {[...groups].map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">{category}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full rounded-xl border border-line bg-white p-5 transition hover:border-navy"
                >
                  <p className="font-semibold text-ink">{item.title}</p>
                  {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AlumniCallout() {
  return (
    <Link
      href="/portal/alumni"
      className="flex items-center justify-between gap-6 rounded-xl bg-navy p-6 text-white transition hover:bg-navy-deep"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Alumni directory</p>
        <p className="mt-1 font-display text-xl font-bold">Find Pi Omega alumni by company, major or class</p>
      </div>
      <span aria-hidden className="text-2xl text-gold">
        →
      </span>
    </Link>
  );
}

export function PanelSkeleton() {
  return <div className="h-48 max-w-xl animate-pulse rounded-xl bg-paper-alt" aria-label="Loading" />;
}
