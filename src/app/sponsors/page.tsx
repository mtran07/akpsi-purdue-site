import type { Metadata } from "next";
import Link from "next/link";
import employers from "@/data/employers.json";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Partner with Alpha Kappa Psi at Purdue to reach motivated business-minded students.",
};

export default function SponsorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sponsors"
        title="Partner with Pi Omega"
        intro="Reach more than 100 brothers and alumni across business, engineering and technology majors."
      />

      {employers.sponsors.length > 0 && (
        <Section title="Our sponsors">
          <ul className="flex flex-wrap gap-3">
            {employers.sponsors.map((sponsor: string) => (
              <li key={sponsor} className="rounded-full border border-line px-4 py-2 text-sm font-medium">
                {sponsor}
              </li>
            ))}
          </ul>
        </Section>
      )}

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

      <Section title="Interested in sponsoring?">
        <p className="max-w-2xl text-muted">
          We host resume workshops, company info sessions and networking nights each semester. Reach out and our
          professional external team will follow up.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          Contact us
        </Link>
      </Section>
    </>
  );
}
