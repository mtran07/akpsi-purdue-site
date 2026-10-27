"use client";

import { useMemo, useState } from "react";
import type { Brother } from "@/lib/portal-types";

// Active brothers, used on the public Members page (no contact info) and in
// the portal's brother directory (withContact). Data: the Roster tab.

type Sort = "pledge" | "name" | "year";

const UNASSIGNED = "Other brothers";

function classOf(gradYear?: string) {
  if (!gradYear) return "";
  const year = gradYear.match(/(20\d\d)/)?.[1];
  return year ? `Class of ’${year.slice(2)}` : gradYear;
}

function yearNumber(b: Brother) {
  return Number(b.gradYear?.match(/(20\d\d)/)?.[1] ?? 9999);
}

export function BrotherRoster({ brothers, withContact = false }: { brothers: Brother[]; withContact?: boolean }) {
  const [query, setQuery] = useState("");
  const [pledgeClass, setPledgeClass] = useState("");
  const [sort, setSort] = useState<Sort>("pledge");
  const [copied, setCopied] = useState(false);

  // Pledge classes in the order they first appear in the sheet.
  const classes = useMemo(
    () => [...new Set(brothers.map((b) => b.pledgeClass || UNASSIGNED))],
    [brothers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brothers.filter((b) => {
      if (pledgeClass && (b.pledgeClass || UNASSIGNED) !== pledgeClass) return false;
      if (!q) return true;
      return [b.name, b.major, b.position, b.pledgeClass, withContact ? b.email : "", withContact ? b.personalEmail : ""]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [brothers, query, pledgeClass, withContact]);

  const groups = useMemo(() => {
    if (sort === "name") return [{ title: "", items: [...visible].sort((a, b) => a.name.localeCompare(b.name)) }];
    if (sort === "year") {
      return [{ title: "", items: [...visible].sort((a, b) => yearNumber(a) - yearNumber(b) || a.name.localeCompare(b.name)) }];
    }
    return classes
      .map((title) => ({ title, items: visible.filter((b) => (b.pledgeClass || UNASSIGNED) === title) }))
      .filter((g) => g.items.length > 0);
  }, [visible, classes, sort]);

  async function copyEmails() {
    const emails = visible.map((b) => b.email || b.personalEmail).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: nothing else to do.
    }
  }

  if (brothers.length === 0) return <p className="text-muted">The roster hasn&apos;t been filled in yet.</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={withContact ? "Search name, major or email" : "Search name or major"}
          aria-label="Search brothers"
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-ink focus:border-navy focus:outline-none"
        />
        <div className="flex gap-3">
          <select
            value={pledgeClass}
            onChange={(e) => setPledgeClass(e.target.value)}
            aria-label="Pledge class"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink sm:flex-none"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink sm:flex-none"
          >
            <option value="pledge">By pledge class</option>
            <option value="name">A–Z</option>
            <option value="year">Class year</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p aria-live="polite">
          {visible.length} {visible.length === 1 ? "brother" : "brothers"}
        </p>
        {withContact && visible.length > 0 && (
          <button type="button" onClick={copyEmails} className="font-semibold text-navy underline underline-offset-4">
            {copied ? "Copied!" : `Copy ${visible.length === brothers.length ? "all" : "these"} emails`}
          </button>
        )}
      </div>

      <div className="mt-6 space-y-10">
        {groups.map((group) => (
          <section key={group.title || "all"} aria-label={group.title || "Brothers"}>
            {group.title && (
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
                {group.title} <span className="text-muted">· {group.items.length}</span>
              </h3>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((b) => (
                <BrotherCard key={b.id} brother={b} withContact={withContact} showClass={sort !== "pledge"} />
              ))}
            </ul>
          </section>
        ))}
        {visible.length === 0 && <p className="text-muted">No brothers match that search.</p>}
      </div>
    </div>
  );
}

function BrotherCard({ brother: b, withContact, showClass }: { brother: Brother; withContact: boolean; showClass: boolean }) {
  const meta = [showClass ? b.pledgeClass : "", classOf(b.gradYear)].filter(Boolean).join(" · ");
  const initials = b.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="flex gap-4 rounded-xl border border-line bg-white p-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-gold"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{b.name}</p>
        {b.position && <p className="text-sm font-medium text-navy">{b.position}</p>}
        {meta && <p className="text-sm text-muted">{meta}</p>}
        {b.major && <p className="text-sm text-muted">{b.major}</p>}

        {(b.linkedin || (withContact && (b.email || b.personalEmail || b.phone))) && (
          <ul className="mt-2 space-y-0.5 text-sm">
            {withContact && b.email && (
              <li>
                <a href={`mailto:${b.email}`} className="break-all text-navy underline-offset-4 hover:underline">
                  {b.email}
                </a>
              </li>
            )}
            {withContact && b.personalEmail && (
              <li>
                <a href={`mailto:${b.personalEmail}`} className="break-all text-navy underline-offset-4 hover:underline">
                  {b.personalEmail}
                </a>
              </li>
            )}
            {withContact && b.phone && (
              <li>
                <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="text-navy underline-offset-4 hover:underline">
                  {b.phone}
                </a>
              </li>
            )}
            {b.linkedin && (
              <li>
                <a href={b.linkedin} target="_blank" rel="noreferrer" className="text-navy underline-offset-4 hover:underline">
                  LinkedIn ↗
                </a>
              </li>
            )}
          </ul>
        )}
      </div>
    </li>
  );
}
