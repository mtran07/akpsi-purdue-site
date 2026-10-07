import type { Metadata } from "next";
import site from "@/data/site.json";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Media",
  description: "Photos, videos and Instagram highlights from AKPsi Pi Omega.",
};

export default function MediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Life in Pi Omega"
        intro="Rush, professional events, service and brotherhood, in photos and video."
      />

      {/*
        TODO (Media task in docs/TASKS.md):
        - Embed the rush video from YouTube (unlisted) in a 16:9 iframe.
        - Embed 3–6 Instagram posts with their official embed code.
        Keep video and large photos OUT of the repo; link or embed them instead.
      */}
      <Section title="Rush video">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-paper-alt text-muted">
          Rush video coming soon
        </div>
      </Section>

      <Section title="On Instagram" tone="alt">
        <p className="text-muted">
          Follow{" "}
          <a href={site.social.instagram} target="_blank" rel="noreferrer" className="font-medium text-navy underline">
            @akpsi_purdue
          </a>{" "}
          for event recaps and rush updates.
        </p>
      </Section>
    </>
  );
}
