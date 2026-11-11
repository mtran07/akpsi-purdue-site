import type { Metadata } from "next";
import Image from "next/image";
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
        title="Meet the Brothers"
        intro="The officers, committee heads and active brothers of Pi Omega."
      />

      <Section id="executive-board" title={`Executive Board · ${execBoard.term}`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {execBoard.members.map((member) => (
            <PersonCard key={member.name} {...member} />
          ))}
        </div>
      </Section>

      <Section id="committee-heads" title={`Committee Heads · ${committeeHeads.term}`} tone="alt">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {committeeHeads.committees.map((item) => (
            <li
              key={item.committee}
              className="reveal overflow-hidden rounded-xl border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
            >
              {item.photo && (
                <div className="relative aspect-[4/5] bg-navy/5">
                  <Image
                    src={item.photo}
                    alt={`${item.committee} committee: ${item.heads.join(" and ")}`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">{item.committee}</p>
                <p className="mt-1.5 font-medium text-ink">{item.heads.join(", ")}</p>
              </div>
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
    <Section id="brothers" title="Active Brothers">
      <BrotherRoster brothers={brothers} />
    </Section>
  );
}
