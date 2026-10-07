import type { Metadata } from "next";
import about from "@/data/about.json";
import site from "@/data/site.json";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "About",
  description: "The history, mission and core values of Alpha Kappa Psi's Pi Omega Chapter at Purdue.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Pi Omega Chapter"
        intro={`Founded nationally in ${site.founded.fraternity}; at Purdue since ${site.founded.chapter}.`}
      />

      <Section title="Our fraternity">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{about.fraternity}</p>
      </Section>

      <Section title="Our mission" tone="alt">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{about.mission}</p>
      </Section>

      <Section title="Core values">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {about.values.map((value, index) => (
            <li key={value.name} className="rounded-xl border border-line p-6">
              <p className="text-xs font-semibold tracking-widest text-gold">0{index + 1}</p>
              <p className="mt-2 font-display text-xl font-bold text-navy">{value.name}</p>
              <p className="mt-2 text-muted">{value.description}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
