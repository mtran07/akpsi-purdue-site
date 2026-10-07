import type { Metadata } from "next";
import rush from "@/data/rush.json";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Rush",
  description: "Rush schedule, eligibility and application for Alpha Kappa Psi at Purdue.",
};

export default function RushPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Rush · ${rush.term}`}
        title={rush.isOpen ? `${rush.term} rush is open` : "Rush AKΨ"}
        intro="Interested in joining our brotherhood? Every major is welcome."
      />

      {!rush.isOpen && (
        <div className="border-b border-gold/40 bg-gold-soft">
          <p className="mx-auto max-w-6xl px-4 py-4 text-sm font-medium text-navy sm:px-6">
            {rush.closedMessage}
          </p>
        </div>
      )}

      <Section title="How to apply">
        <p className="max-w-3xl text-lg text-muted">{rush.eligibility}</p>
        {rush.isOpen && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={rush.applicationUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              Open the written application
            </a>
            <p className="text-sm text-muted">Due {rush.applicationDeadline}</p>
          </div>
        )}
      </Section>

      <Section title={`${rush.term} schedule`} tone="alt">
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {rush.events.map((event) => (
            <li
              key={`${event.type}-${event.date}`}
              className="grid gap-1 p-5 sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:gap-6"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{event.type}</p>
              <p className="font-medium text-ink">
                {event.date} · {event.time}
              </p>
              <p className="text-sm text-muted">{event.location}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
