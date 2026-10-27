import Image from "next/image";
import Link from "next/link";
import chapterPhoto from "../../public/images/chapter/pi-omega-chapter.jpg";
import site from "@/data/site.json";
import about from "@/data/about.json";
import rush from "@/data/rush.json";
import employers from "@/data/employers.json";
import { Section } from "@/components/page-header";
import { CountUp } from "@/components/count-up";
import { Marquee } from "@/components/marquee";
import { PresidentMessage } from "@/components/president-message";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[36rem] w-[36rem] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-gold)_14%,transparent),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-20 sm:px-6 sm:pb-36 sm:pt-28">
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

      {/* Chapter photo, overlapping the bottom of the hero */}
      <div className="relative mx-auto -mt-16 max-w-6xl px-4 sm:-mt-24 sm:px-6">
        <figure>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-navy-deep shadow-xl ring-1 ring-black/5 sm:aspect-[37/10]">
            <Image
              src={chapterPhoto}
              alt="Brothers of AKPsi's Pi Omega chapter filling a Purdue lecture hall, making the chapter's hand sign"
              fill
              sizes="(min-width: 1152px) 1104px, 100vw"
              placeholder="blur"
              loading="eager"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-center text-sm text-muted">The Pi Omega chapter</figcaption>
        </figure>
      </div>

      <Section title="Our mission">
        <p className="reveal max-w-3xl text-lg leading-relaxed text-muted">{about.mission}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {about.values.map((value) => (
            <li key={value.name} className="reveal rounded-xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
              <p className="font-display text-lg font-bold text-navy">{value.name}</p>
              <p className="mt-2 text-sm text-muted">{value.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Chapter by the numbers: each counts up the first time it scrolls into view */}
      <section className="bg-navy text-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-4">
          {site.stats.map((stat) => (
            // Label first in the markup (dt before dd); flipped visually so the number sits on top.
            <div key={stat.label} className="reveal flex flex-col-reverse justify-end">
              <dt className="mt-2 text-sm text-white/75">{stat.label}</dt>
              <dd className="text-4xl font-semibold tracking-tight text-gold sm:text-5xl">
                {stat.animate === false ? (
                  `${stat.value}${stat.suffix ?? ""}`
                ) : (
                  <CountUp value={stat.value} suffix={stat.suffix ?? ""} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <PresidentMessage />

      <Section title={employers.heading} tone="alt">
        <Marquee items={employers.companies} label="Companies where Pi Omega brothers work" />
      </Section>

      <section className="bg-gold-soft">
        <div className="reveal mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
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
