import type { Metadata } from "next";
import execBoard from "@/data/exec-board.json";
import committeeHeads from "@/data/committee-heads.json";
import { PageHeader, Section } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";

export const metadata: Metadata = {
  title: "Members",
  description: "Meet the executive board and committee heads of AKPsi Pi Omega.",
};

export default function MembersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Meet the brothers"
        intro="The officers and committee heads who lead Pi Omega this semester."
      />

      <Section id="executive-board" title={`Executive board · ${execBoard.term}`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {execBoard.members.map((member) => (
            <PersonCard key={member.name} {...member} />
          ))}
        </div>
      </Section>

      <Section id="committee-heads" title={`Committee heads · ${committeeHeads.term}`} tone="alt">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {committeeHeads.committees.map((item) => (
            <li key={item.committee} className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{item.committee}</p>
              <p className="mt-2 font-medium text-ink">{item.heads.join(" & ")}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
