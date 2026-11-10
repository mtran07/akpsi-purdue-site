import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { ExecDashboardView } from "@/components/portal/exec-dashboard";
import { getDashboardForOfficer } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "Exec dashboard" };

export default function ExecPage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal · Officers"
        title="Exec dashboard"
        intro="Access requests, points, attendance, excusals and website messages in one place."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Dashboard() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;

  let result;
  try {
    result = await getDashboardForOfficer(); // redirects to /portal unless an officer
  } catch (error) {
    // redirect() works by throwing; let it through.
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Couldn't load exec dashboard", error);
    return <p className="text-muted">The dashboard couldn&apos;t load right now. Try again in a minute.</p>;
  }
  return <ExecDashboardView officer={result.officer} data={result.data} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-paper-alt" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-paper-alt" />
    </div>
  );
}
