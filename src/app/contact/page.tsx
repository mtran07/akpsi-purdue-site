import type { Metadata } from "next";
import site from "@/data/site.json";
import { PageHeader, Section } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about joining, sponsoring or reconnecting with Alpha Kappa Psi at Purdue? Get in touch.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="Thinking about rushing, interested in sponsoring the chapter, or an alum reconnecting? Send us a note."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ContactForm />
          <aside className="space-y-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Follow along</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href={site.social.instagram} target="_blank" rel="noreferrer" className="font-medium text-navy underline underline-offset-4">
                    Instagram
                  </a>
                  <span className="text-muted">: rush updates and event recaps</span>
                </li>
                {site.social.linkedin && (
                  <li>
                    <a href={site.social.linkedin} target="_blank" rel="noreferrer" className="font-medium text-navy underline underline-offset-4">
                      LinkedIn
                    </a>
                    <span className="text-muted">: chapter news and alumni</span>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Where we are</p>
              <p className="mt-3 text-muted">{site.address}</p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
