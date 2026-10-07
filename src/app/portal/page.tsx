import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Member sign in",
  robots: { index: false },
};

// Placeholder until phase 4 of the migration plan (member portal).
// Sign-in will be limited to approved members; the alumni and member
// directories move here, never onto public pages or into the repo.
export default function PortalPage() {
  return (
    <>
      <PageHeader eyebrow="For brothers" title="Member portal" />
      <Section>
        <p className="max-w-2xl text-lg text-muted">
          The new member portal, with the internal calendar, resources and the alumni directory, is coming in
          spring 2027. Until then, reach out to the Technology Committee for anything you need.
        </p>
      </Section>
    </>
  );
}
