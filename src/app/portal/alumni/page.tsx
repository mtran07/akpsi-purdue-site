import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { AlumniDirectory } from "@/components/portal/alumni-directory";
import { getAlumniForMember } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "Alumni directory" };

export default function AlumniPage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title="Alumni directory"
        intro="Pi Omega alumni who've shared their details with the chapter. For brothers only: please don't share contact info outside AKPsi."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<DirectorySkeleton />}>
            <Directory />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Directory() {
  // Always render per request: this page must never be built ahead of time.
  await connection();
  if (!isPortalConfigured()) {
    return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;
  }

  // Redirects to /portal unless the visitor is a current member.
  const alumni = await getAlumniForMember();
  return <AlumniDirectory alumni={alumni} canDraft={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading alumni">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-paper-alt" />
      ))}
    </div>
  );
}
