import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { InternshipBoard, type AlumMatch } from "@/components/portal/internship-board";
import { getAlumniForMember } from "@/lib/dal";
import { INTERNSHIP_REPO, INTERNSHIP_TERM, companyTokens, getInternships, sameCompany } from "@/lib/internships";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "Internships" };

export default function InternshipsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title={`${INTERNSHIP_TERM} internships`}
        intro="Open tech, product, data and quant internships, updated hourly. Tap Apply to go straight to the application, and tap the ★ badge to see Pi Omega alumni who work or worked there."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<BoardSkeleton />}>
            <Board />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Board() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;

  // Redirects to /portal unless the visitor is a current member.
  const alumni = await getAlumniForMember();
  let listings;
  try {
    listings = await getInternships();
  } catch (error) {
    console.error("Couldn't load internships", error);
    return (
      <p className="text-muted">
        The internship list couldn&apos;t load right now. You can browse it directly on{" "}
        <a href={INTERNSHIP_REPO} target="_blank" rel="noreferrer" className="font-medium text-navy underline">
          GitHub
        </a>
        .
      </p>
    );
  }

  // Every company each alum works at now or listed as a previous employer.
  const employers = alumni.flatMap((a) => [
    ...(a.company ? [{ alum: a, company: a.company, current: true }] : []),
    ...(a.prevCompanies ?? "")
      .split(/[,;\n]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((company) => ({ alum: a, company, current: false })),
  ]);
  const employerTokens = employers.map((e) => ({ ...e, tokens: companyTokens(e.company) }));

  // Alumni for each listed company (only companies that have openings are sent to the page).
  const alumniAt: Record<string, AlumMatch[]> = {};
  for (const company of new Set(listings.map((l) => l.company))) {
    const tokens = companyTokens(company);
    const found = new Map<string, AlumMatch>();
    for (const e of employerTokens) {
      if (!sameCompany(tokens, e.tokens)) continue;
      const prev = found.get(e.alum.id);
      // Someone who works there now beats an earlier stint at the same place.
      if (prev && (prev.current || !e.current)) continue;
      found.set(e.alum.id, {
        id: e.alum.id,
        name: e.alum.name,
        gradYear: e.alum.gradYear,
        position: e.current ? e.alum.position : undefined,
        company: e.company,
        current: e.current,
        linkedin: e.alum.linkedin,
        email: e.alum.email,
      });
    }
    if (found.size) {
      alumniAt[company] = [...found.values()].sort((a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name));
    }
  }

  return <InternshipBoard listings={listings} alumniAt={alumniAt} source={INTERNSHIP_REPO} />;
}

function BoardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading internships">
      <div className="h-12 animate-pulse rounded-xl bg-paper-alt" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-paper-alt" />
      ))}
    </div>
  );
}
