import Link from "next/link";
import site from "@/data/site.json";
import about from "@/data/about.json";
import rush from "@/data/rush.json";
import employers from "@/data/employers.json";
import { Section } from "@/components/page-header";
import { CountUp } from "@/components/count-up";
import { Marquee } from "@/components/marquee";
import { PresidentMessage } from "@/components/president-message";
import { HomeHero } from "@/components/home-hero";

export default function HomePage() {
  return (
    <>
      <HomeHero
        eyebrow={`${site.school} · ${site.chapter}`}
        lead="Shaping People,"
        emphasis="Shaping Business."
        intro="Purdue's gender-inclusive professional business fraternity, open to every major."
        primary={{ href: "/rush", label: rush.isOpen ? `Rush ${rush.term}` : "Rush info" }}
        secondary={{ href: "/portal", label: "Brother portal" }}
      />

      <Section id="mission" title="Our mission">
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
