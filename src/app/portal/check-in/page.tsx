import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { CheckInButton } from "@/components/portal/check-in-button";
import { Card, NotMemberPanel } from "@/components/portal/portal-panels";
import { isOpen, ticketIsValid, TICKET_COOKIE } from "@/lib/checkin";
import { getViewer } from "@/lib/dal";
import { fetchCheckinState, isPortalConfigured } from "@/lib/portal-data";
import { signInForCheckIn } from "./actions";

export const metadata: Metadata = { title: "Check in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  expired: "That code expired. Scan the code on the screen in the room. It changes every 30 seconds.",
  closed: "Check-in is closed. Ask the secretary to add you.",
  unavailable: "Check-in isn't reachable right now. Try scanning again in a moment.",
};

export default function CheckInPage({ searchParams }: PageProps<"/portal/check-in">) {
  return (
    <>
      <PageHeader eyebrow="Member portal" title="Chapter check-in" />
      <Section>
        <div className="mx-auto max-w-md">
          <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-paper-alt" />}>
            <CheckIn searchParams={searchParams} />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function CheckIn({ searchParams }: { searchParams: PageProps<"/portal/check-in">["searchParams"] }) {
  await connection();
  const { error } = await searchParams;
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;

  const viewer = await getViewer();
  if (viewer.status === "signed-out") {
    return (
      <Card>
        <h2 className="font-display text-2xl font-bold text-navy">Sign in to check in</h2>
        <p className="mt-2 text-muted">Use the Google account you use for the brother portal. You&apos;ll come right back here.</p>
        <form action={signInForCheckIn} className="mt-6">
          <button className="w-full rounded-full bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-deep">
            Sign in with Google
          </button>
        </form>
      </Card>
    );
  }
  if (viewer.status === "not-member") return <NotMemberPanel email={viewer.email} name={viewer.name} />;

  if (typeof error === "string" && ERRORS[error]) return <Problem message={ERRORS[error]} />;

  let state;
  try {
    state = await fetchCheckinState();
  } catch {
    return <Problem message={ERRORS.unavailable} />;
  }
  const session = state.session;
  if (!isOpen(session)) return <Problem message="There's no check-in open right now." />;

  const mine = state.checkins.find((c) => c.email === viewer.email);
  const jar = await cookies();
  const hasTicket = ticketIsValid(jar.get(TICKET_COOKIE)?.value, session);

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">{session.date}</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-navy">{session.event}</h2>
      <p className="mt-1 text-sm text-muted">Checking in as {viewer.name}</p>
      <div className="mt-6">
        {mine ? (
          <CheckedInAlready at={mine.at} />
        ) : hasTicket ? (
          <CheckInButton needsLocation={!!session.geo} event={session.event} />
        ) : (
          <p className="rounded-lg bg-gold-soft p-4 text-sm text-navy">
            Scan the code on the screen in the room with your phone camera to check in.
          </p>
        )}
      </div>
    </Card>
  );
}

function CheckedInAlready({ at }: { at: number }) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis", hour: "numeric", minute: "2-digit" }).format(
    new Date(at),
  );
  return (
    <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-600/20">
      You&apos;re checked in ({time}).
    </p>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <Card>
      <h2 className="font-display text-2xl font-bold text-navy">Can&apos;t check in</h2>
      <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        {message}
      </p>
      <Link href="/portal" className="mt-6 inline-block text-sm font-medium text-navy underline underline-offset-4">
        Go to the portal
      </Link>
    </Card>
  );
}
