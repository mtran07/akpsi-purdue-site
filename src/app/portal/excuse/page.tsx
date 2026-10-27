import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { ExcusalForm, type EventOption } from "@/components/portal/excusal-form";
import { getEventsForMember, requireMember } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "Excusal request" };

const dateLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Indiana/Indianapolis",
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function ExcusePage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title="Excusal request"
        intro="Can't make a required event? Send it to the secretary here, with proof if you have it."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<div className="h-96 max-w-2xl animate-pulse rounded-xl bg-paper-alt" />}>
            <Form />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Form() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;
  const viewer = await requireMember();
  const calendar = await getEventsForMember();

  const events: EventOption[] = (calendar?.events ?? []).map((event) => {
    const date = event.allDay ? new Date(`${event.start}T12:00:00Z`) : new Date(event.start);
    return { title: event.title, date: dateLabel.format(date) };
  });
  return <ExcusalForm events={events} email={viewer.email} />;
}
