import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import {
  NotConfiguredPanel,
  NotMemberPanel,
  PanelSkeleton,
  PortalCallouts,
  ResourceList,
  SignInPanel,
  SignOutButton,
} from "@/components/portal/portal-panels";
import { UpcomingEvents } from "@/components/portal/upcoming-events";
import { getEventsForMember, getResourcesForMember, getViewer } from "@/lib/dal";
import { isPortalConfigured } from "@/lib/portal-data";

export default function PortalPage(props: PageProps<"/portal">) {
  return (
    <>
      <PageHeader eyebrow="For brothers" title="Member portal" />
      <Section>
        {/* Everything that depends on who's signed in streams in behind this boundary. */}
        <Suspense fallback={<PanelSkeleton />}>
          <PortalContent searchParams={props.searchParams} />
        </Suspense>
      </Section>
    </>
  );
}

async function PortalContent({ searchParams }: { searchParams: PageProps<"/portal">["searchParams"] }) {
  // Always render per request: sign-in state must never be prerendered or prefetched.
  await connection();
  const { error } = await searchParams;
  if (!isPortalConfigured()) return <NotConfiguredPanel />;

  const viewer = await getViewer();

  if (viewer.status === "signed-out") {
    return <SignInPanel error={typeof error === "string" ? error : undefined} />;
  }
  if (viewer.status === "not-member") return <NotMemberPanel email={viewer.email} name={viewer.name} />;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-lg text-ink">
          Welcome back, <span className="font-semibold">{viewer.name.split(" ")[0]}</span>.
        </p>
        <SignOutButton />
      </div>

      <PortalCallouts />

      <div>
        <h2 className="font-display text-2xl font-bold text-navy">Upcoming events</h2>
        <div className="mt-6">
          <Suspense fallback={<PanelSkeleton />}>
            <Events />
          </Suspense>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-navy">Brother resources</h2>
        <div className="mt-6">
          <Suspense fallback={<PanelSkeleton />}>
            <Resources />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Events() {
  const calendar = await getEventsForMember();
  return <UpcomingEvents calendar={calendar} />;
}

async function Resources() {
  const resources = await getResourcesForMember();
  return <ResourceList resources={resources} />;
}
