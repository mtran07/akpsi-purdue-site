"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import type { Internship } from "@/lib/internships";

export type AlumMatch = {
  id: string;
  name: string;
  gradYear?: string;
  position?: string;
  /** The employer as the alum wrote it. */
  company: string;
  /** Works there now (false: listed it as a previous company). */
  current: boolean;
  linkedin?: string;
  email?: string;
};

const PAGE = 40;
const DAY = 86_400;
const STORAGE_KEY = "akpsi-applied";

function ago(posted: number, now: number) {
  const days = Math.floor((now - posted) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/*
  Applied checkmarks live in this browser only; nothing is sent anywhere.
  If storage is blocked (private browsing), they still work until the tab closes.
*/
const listeners = new Set<() => void>();
let memory = "[]";
function readApplied() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}
function subscribeApplied(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function useApplied() {
  const raw = useSyncExternalStore(subscribeApplied, readApplied, () => "[]");
  const applied = useMemo(() => {
    try {
      const list = JSON.parse(raw);
      return new Set<string>(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  const toggle = (id: string) => {
    const next = new Set(applied);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    memory = JSON.stringify([...next]);
    try {
      localStorage.setItem(STORAGE_KEY, memory);
    } catch {}
    listeners.forEach((l) => l());
  };
  return { applied, toggle };
}

export function InternshipBoard({
  listings,
  alumniAt,
  source,
}: {
  listings: Internship[];
  alumniAt: Record<string, AlumMatch[]>;
  source: string;
}) {
  const [openAlumni, setOpenAlumni] = useState<string | null>(null);
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [newOnly, setNewOnly] = useState(false);
  const [alumniOnly, setAlumniOnly] = useState(false);
  const [hideApplied, setHideApplied] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const { applied, toggle } = useApplied();
  const q = useDeferredValue(query.trim().toLowerCase());

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [listings]);

  const filtered = useMemo(
    () =>
      listings.filter(
        (l) =>
          (!category || l.category === category) &&
          (!newOnly || now - l.posted < 7 * DAY) &&
          (!alumniOnly || Boolean(alumniAt[l.company])) &&
          (!hideApplied || !applied.has(l.id)) &&
          (!q || `${l.company} ${l.title} ${l.locations}`.toLowerCase().includes(q)),
      ),
    [listings, category, newOnly, alumniOnly, hideApplied, applied, q, now, alumniAt],
  );

  // Back to the first page whenever the filters change.
  const filterKey = `${q}|${category}|${newOnly}|${alumniOnly}|${hideApplied}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setShown(PAGE);
  }

  const appliedCount = listings.filter((l) => applied.has(l.id)).length;
  const toggleClass = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
      on ? "bg-navy text-white ring-navy" : "bg-white text-ink ring-line hover:ring-navy"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
        <label className="block">
          <span className="sr-only">Search internships</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role or city"
            className="w-full rounded-lg border border-line px-4 py-2.5 text-ink focus:border-navy focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <button type="button" onClick={() => setCategory("")} aria-pressed={!category} className={toggleClass(!category)}>
            All <span className="opacity-60">{listings.length}</span>
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(category === name ? "" : name)}
              aria-pressed={category === name}
              className={toggleClass(category === name)}
            >
              {name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button type="button" onClick={() => setNewOnly((v) => !v)} aria-pressed={newOnly} className={toggleClass(newOnly)}>
            New This Week
          </button>
          <button type="button" onClick={() => setAlumniOnly((v) => !v)} aria-pressed={alumniOnly} className={toggleClass(alumniOnly)}>
            Pi Omega Alumni There
          </button>
          <button type="button" onClick={() => setHideApplied((v) => !v)} aria-pressed={hideApplied} className={toggleClass(hideApplied)}>
            Hide Applied{appliedCount ? ` (${appliedCount})` : ""}
          </button>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {filtered.length.toLocaleString()} {filtered.length === 1 ? "internship" : "internships"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-white p-6 text-muted">Nothing matches. Try fewer filters.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {filtered.slice(0, shown).map((l) => {
            const done = applied.has(l.id);
            const alums = alumniAt[l.company];
            const expanded = openAlumni === l.id;
            return (
              <li
                key={l.id}
                className={`rounded-xl border bg-white p-4 sm:p-5 ${done ? "border-green-600/30 bg-green-50/40" : "border-line"}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-navy">{l.company}</span>
                      <span className="rounded-full bg-paper-alt px-2 py-0.5 text-xs text-muted">{l.category}</span>
                      {alums && (
                        <button
                          type="button"
                          onClick={() => setOpenAlumni(expanded ? null : l.id)}
                          aria-expanded={expanded}
                          aria-controls={`alumni-${l.id}`}
                          className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-navy ring-1 ring-inset ring-gold/40 hover:ring-gold"
                        >
                          ★ {alums.length} Pi Omega {alums.length === 1 ? "Alum" : "Alumni"} {expanded ? "▴" : "▾"}
                        </button>
                      )}
                    </p>
                    <p className="mt-1 text-ink">{l.title}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {l.locations || "Location not listed"} · {ago(l.posted, now)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(l.id)}
                      aria-pressed={done}
                      className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset ${
                        done ? "bg-green-600 text-white ring-green-600" : "text-muted ring-line hover:ring-navy"
                      }`}
                    >
                      {done ? "✓ Applied" : "Mark Applied"}
                    </button>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
                    >
                      Apply<span className="sr-only"> to {l.company}, {l.title} (opens in a new tab)</span> ↗
                    </a>
                  </div>
                </div>

                {alums && expanded && (
                  <div id={`alumni-${l.id}`} className="mt-4 rounded-lg bg-gold-soft/50 p-3 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy">
                      Pi Omega Alumni at {l.company}
                    </p>
                    <ul className="mt-2 divide-y divide-gold/20">
                      {alums.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <p className="font-medium text-ink">
                              {a.name}
                              {a.gradYear && <span className="font-normal text-muted"> · Class of {a.gradYear}</span>}
                            </p>
                            <p className="text-sm text-muted">
                              {a.current ? (
                                <>
                                  {a.position ? `${a.position} at ` : "Works at "}
                                  {a.company}
                                </>
                              ) : (
                                <>Previously at {a.company}</>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {a.linkedin && (
                              <a
                                href={a.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-inset ring-line hover:ring-navy"
                              >
                                LinkedIn ↗
                              </a>
                            )}
                            {a.email && (
                              <a
                                href={`mailto:${a.email}`}
                                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-inset ring-line hover:ring-navy"
                              >
                                Email
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/portal/alumni?q=${encodeURIComponent(l.company)}`}
                      className="mt-2 inline-block text-xs font-medium text-navy underline underline-offset-4"
                    >
                      See them in the alumni directory (coffee chat drafts, career paths)
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {shown < filtered.length && (
        <button
          type="button"
          onClick={() => setShown((s) => s + PAGE)}
          className="mt-6 w-full rounded-full border border-line bg-white py-3 text-sm font-semibold text-navy hover:border-navy"
        >
          Show more ({(filtered.length - shown).toLocaleString()} left)
        </button>
      )}

      <p className="mt-8 text-xs text-muted">
        Listings from the community-maintained{" "}
        <a href={source} target="_blank" rel="noreferrer" className="underline">
          SimplifyJobs internship list
        </a>
        , refreshed hourly. It covers tech, product, data, quant and hardware roles. &ldquo;Applied&rdquo; checkmarks are
        saved in this browser only.
      </p>
    </div>
  );
}
