import type { Metadata } from "next";
import { Suspense } from "react";
import execBoard from "@/data/exec-board.json";
import committeeHeads from "@/data/committee-heads.json";
import { PageHeader, Section } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { BrotherRoster } from "@/components/brother-roster";
import { getPublicRoster } from "@/lib/public-roster";

export const metadata: Metadata = {
  title: "Members",
  description: "Meet the executive board, committee heads and active brothers of AKPsi Pi Omega.",
};

export default function MembersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Meet the brothers"
        intro="The officers, committee heads and active brothers of Pi Omega."
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
            <li key={item.committee} className="reveal rounded-xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{item.committee}</p>
              <p className="mt-2 font-medium text-ink">{item.heads.join(" & ")}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Suspense>
        <ActiveBrothers />
      </Suspense>
    </>
  );
}

async function ActiveBrothers() {
  const brothers = await getPublicRoster();
  // No roster yet, or the sheet is unreachable: leave the section out.
  if (!brothers || brothers.length === 0) return null;
  return (
    <Section id="brothers" title="Active brothers">
      <BrotherRoster brothers={brothers} />
    </Section>
  );
}
