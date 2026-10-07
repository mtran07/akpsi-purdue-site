import type { Metadata } from "next";
import site from "@/data/site.json";
import { PageHeader, Section } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about joining or sponsoring Alpha Kappa Psi at Purdue? Get in touch.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="Interested in sponsoring our chapter or have questions about joining? Send us a note."
      />

      <Section>
        {site.contactFormUrl ? (
          <iframe
            src={site.contactFormUrl}
            title="Contact form"
            className="h-[900px] w-full rounded-xl border border-line"
          />
        ) : (
          // TODO (Contact task in docs/TASKS.md): create the form in Google Forms or Tally
          // under the chapter tech account, then paste its embed URL into src/data/site.json.
          <div className="rounded-xl border border-dashed border-line bg-paper-alt p-10 text-center text-muted">
            Contact form coming soon. In the meantime, message us on{" "}
            <a href={site.social.instagram} target="_blank" rel="noreferrer" className="font-medium text-navy underline">
              Instagram
            </a>
            .
          </div>
        )}
        <p className="mt-6 text-sm text-muted">{site.address}</p>
      </Section>
    </>
  );
}
