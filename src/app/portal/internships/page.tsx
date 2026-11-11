import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { InternshipBoard } from "@/components/portal/internship-board";
import { getAlumniForMember } from "@/lib/dal";
import { INTERNSHIP_REPO, INTERNSHIP_TERM, companyKey, getInternships } from "@/lib/internships";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "Internships" };

export default function InternshipsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title={`${INTERNSHIP_TERM} internships`}
        intro="Open tech, product, data and quant internships, updated hourly. Tap Apply to go straight to the application, and see when a Pi Omega alum works there."
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

  // How many alumni work at each company (current employer only), by normalized name.
  const alumniAt: Record<string, number> = {};
  for (const a of alumni) {
    if (!a.company) continue;
    const key = companyKey(a.company);
    if (key) alumniAt[key] = (alumniAt[key] ?? 0) + 1;
  }
  const withAlumni = listings.map((l) => ({ ...l, alumni: alumniAt[companyKey(l.company)] ?? 0 }));

  return <InternshipBoard listings={withAlumni} source={INTERNSHIP_REPO} />;
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
