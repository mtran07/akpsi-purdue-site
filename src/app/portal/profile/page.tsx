import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { ProfileForm } from "@/components/portal/profile-form";
import { getMyProfile } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export const metadata: Metadata = { title: "My profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title="My profile"
        intro="Keep your info current. It updates the brother directory and the public roster."
      />
      <Section>
        <Link href="/portal" className="text-sm font-medium text-navy underline underline-offset-4">
          ← Back to the portal
        </Link>
        <div className="mt-8">
          <Suspense fallback={<div className="h-96 max-w-2xl animate-pulse rounded-xl bg-paper-alt" />}>
            <Profile />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

async function Profile() {
  await connection();
  if (!isPortalConfigured()) return <p className="text-muted">The member portal isn&apos;t switched on yet.</p>;

  let result;
  try {
    result = await getMyProfile(); // redirects to /portal unless a current member
  } catch (error) {
    console.error("Couldn't load profile", error);
    return <p className="text-muted">Your profile couldn&apos;t load right now. Try again in a minute.</p>;
  }
  if (!result.found) {
    return (
      <p className="max-w-2xl rounded-xl border border-line bg-white p-6 text-muted">
        We couldn&apos;t find you on the chapter roster. Ask the VP of Membership to add you (or to add the email
        you sign in with), then come back here.
      </p>
    );
  }
  return <ProfileForm profile={result.profile} />;
}
