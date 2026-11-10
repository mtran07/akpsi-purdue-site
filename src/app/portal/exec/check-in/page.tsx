import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { CheckInConsole } from "@/components/portal/check-in-console";
import { getBrothersForMember, getOfficer } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";
import { getLiveCheckin } from "./actions";

export const metadata: Metadata = { title: "Chapter check-in" };

export default function CheckInConsolePage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal · Officers"
        title="Chapter check-in"
        intro="Put the code on the projector at the start of chapter. Brothers scan it, and you apply the list to the points table."
      />
      <Section>
        <Link href="/portal/exec" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the exec dashboard
        </Link>
        <div className="mt-8">
          <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-paper-alt" aria-label="Loading" />}>
            <Console />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Console() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;
  const officer = await getOfficer();
  if (!officer) redirect("/portal");

  let data;
  try {
    const [initial, brothers] = await Promise.all([getLiveCheckin(), getBrothersForMember().catch(() => [])]);
    data = { initial, brothers };
  } catch (error) {
    console.error("Couldn't load check-in", error);
    return <p className="text-muted">Check-in couldn&apos;t load right now. Try again in a minute.</p>;
  }
  const list = data.brothers
    .filter((b) => b.name)
    .map((b) => ({ name: b.name, email: (b.email || b.personalEmail || "").toLowerCase() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <CheckInConsole initial={data.initial} brothers={list} />;
}
