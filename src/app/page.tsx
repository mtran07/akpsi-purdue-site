import Link from "next/link";
import site from "@/data/site.json";
import about from "@/data/about.json";
import rush from "@/data/rush.json";
import employers from "@/data/employers.json";
import { Section } from "@/components/page-header";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            {site.school} · {site.chapter}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
            {site.tagline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">
            Purdue&apos;s gender-inclusive professional business fraternity, open to every major.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/rush"
              className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:brightness-110"
            >
              {rush.isOpen ? `Rush ${rush.term}` : "Rush info"}
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition hover:border-white"
            >
              About Pi Omega
            </Link>
          </div>
        </div>
      </section>

      <Section title="Our mission">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{about.mission}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {about.values.map((value) => (
            <li key={value.name} className="rounded-xl border border-line p-5">
              <p className="font-display text-lg font-bold text-navy">{value.name}</p>
              <p className="mt-2 text-sm text-muted">{value.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={employers.heading} tone="alt">
        <ul className="flex flex-wrap gap-3">
          {employers.companies.map((company) => (
            <li
              key={company}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
            >
              {company}
            </li>
          ))}
        </ul>
      </Section>

      <section className="bg-gold-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">Interested in joining our brotherhood?</h2>
            <p className="mt-2 text-muted">
              {rush.isOpen ? `${rush.term} rush is open.` : rush.closedMessage}
            </p>
          </div>
          <Link
            href="/rush"
            className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            See rush details
          </Link>
        </div>
      </section>
    </>
  );
}
