import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { PointsSummary } from "@/components/portal/points-summary";
import { getMyPoints } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "My points" };

export default function PointsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title="My points"
        intro="Your points and chapter attendance this semester, straight from the secretary's points table."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<div className="h-72 max-w-3xl animate-pulse rounded-xl bg-paper-alt" />}>
            <Points />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Points() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;

  let points;
  try {
    points = await getMyPoints(); // redirects to /portal unless a current member
  } catch (error) {
    console.error("Couldn't load points", error);
    return <p className="text-muted">Points couldn&apos;t load right now. Try again in a minute.</p>;
  }
  if (!points.configured) return <p className="text-muted">The points table hasn&apos;t been connected yet.</p>;
  if (!points.found) {
    return (
      <p className="max-w-3xl rounded-xl border border-line bg-white p-6 text-muted">
        We couldn&apos;t find you in the points table. Ask the secretary to check that your name and Purdue email
        there match the roster.
      </p>
    );
  }
  return <PointsSummary points={points} />;
}
