import type { Metadata } from "next";
import site from "@/data/site.json";
import instagram from "@/data/instagram.json";
import { InstagramEmbeds } from "@/components/instagram-embeds";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Media",
  description: "Instagram highlights from AKPsi Pi Omega: brother spotlights, interview advice, families, formal and retreat.",
};

export default function MediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Life in Pi Omega"
        intro="Professional development, brotherhood and chapter traditions, straight from our Instagram."
      />

      <Section title="On Instagram">
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
