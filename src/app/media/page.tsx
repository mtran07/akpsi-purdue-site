import type { Metadata } from "next";
import site from "@/data/site.json";
import instagram from "@/data/instagram.json";
import { InstagramEmbeds } from "@/components/instagram-embeds";
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
        Instagram posts: add links to src/data/instagram.json.
        Keep video and large photos OUT of the repo; link or embed them instead.
      */}
      <Section title="Rush video">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-paper-alt text-muted">
          Rush video coming soon
        </div>
      </Section>

      <Section title="On Instagram" tone="alt">
        <InstagramEmbeds posts={instagram.posts} />
        <p className="mt-8 text-muted">
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
