"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { draftCoffeeChat, type DraftResult } from "@/app/portal/actions";
import type { Alumnus } from "@/lib/portal-types";

const PAGE_SIZE = 60;

/** Pulls a 4-digit year out of values like "May 2019" or "2019". */
function yearOf(value?: string) {
  const years = value?.match(/(19|20)\d{2}/g);
  return years ? years[years.length - 1] : undefined;
}

function matches(alum: Alumnus, query: string) {
  if (!query) return true;
  const haystack = [alum.name, alum.company, alum.position, alum.location, alum.major]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function AlumniDirectory({ alumni, canDraft }: { alumni: Alumnus[]; canDraft: boolean }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drafting, setDrafting] = useState<Alumnus | null>(null);
  const deferredQuery = useDeferredValue(query.trim());

  const years = useMemo(
    () => [...new Set(alumni.map((a) => yearOf(a.gradYear)).filter(Boolean) as string[])].sort().reverse(),
    [alumni],
  );
  const majors = useMemo(
    () => [...new Set(alumni.map((a) => a.major?.trim()).filter(Boolean) as string[])].sort(),
    [alumni],
  );

  const results = useMemo(
    () =>
      alumni.filter(
        (a) =>
          matches(a, deferredQuery) &&
          (!year || yearOf(a.gradYear) === year) &&
          (!major || a.major?.trim() === major),
      ),
    [alumni, deferredQuery, year, major],
  );

  const resetPaging = () => setVisible(PAGE_SIZE);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="alumni-search">
          Search alumni
        </label>
        <input
          id="alumni-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetPaging();
          }}
          placeholder="Search by name, company, role or city"
          className="w-full rounded-full border border-line px-5 py-3 text-sm outline-none focus:border-navy"
        />
        <select
          aria-label="Graduation year"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            resetPaging();
          }}
          className="rounded-full border border-line bg-white px-4 py-3 text-sm"
        >
          <option value="">All classes</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Class of {y}
            </option>
          ))}
        </select>
        <select
          aria-label="Major"
          value={major}
          onChange={(e) => {
            setMajor(e.target.value);
            resetPaging();
          }}
          className="max-w-full rounded-full border border-line bg-white px-4 py-3 text-sm sm:max-w-56"
        >
          <option value="">All majors</option>
          {majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {results.length === alumni.length
          ? `${alumni.length} alumni`
          : `${results.length} of ${alumni.length} alumni`}
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.slice(0, visible).map((alum) => (
          <li key={alum.id} className="flex flex-col rounded-xl border border-line bg-white p-5">
            <p className="font-semibold text-ink">{alum.name}</p>
            {(alum.position || alum.company) && (
              <p className="mt-1 text-sm text-ink">
                {[alum.position, alum.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {alum.location && <p className="mt-0.5 text-sm text-muted">{alum.location}</p>}
            {(alum.major || yearOf(alum.gradYear)) && (
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gold">
                {[alum.major, yearOf(alum.gradYear) && `Class of ${yearOf(alum.gradYear)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4 text-sm font-medium">
              {alum.linkedin && (
                <a href={alum.linkedin} target="_blank" rel="noreferrer" className="text-navy hover:underline">
                  LinkedIn
                </a>
              )}
              {alum.email && (
                <a href={`mailto:${alum.email}`} className="text-navy hover:underline">
                  Email
                </a>
              )}
              {canDraft && alum.email && (
                <button type="button" onClick={() => setDrafting(alum)} className="text-navy hover:underline">
                  Draft coffee chat
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="mt-8 text-center text-muted">No alumni match those filters.</p>
      )}

      {visible < results.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-navy px-6 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
          >
            Show more ({results.length - visible} left)
          </button>
        </div>
      )}

      {drafting && <CoffeeChatDialog alum={drafting} onClose={() => setDrafting(null)} />}
    </div>
  );
}

function CoffeeChatDialog({ alum, onClose }: { alum: Alumnus; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<DraftResult | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      const draft = await draftCoffeeChat(alum.id, note);
      setResult(draft);
      if (draft.ok) {
        setSubject(draft.subject);
        setBody(draft.body);
      }
    });

  const mailto = `mailto:${alum.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <dialog
      ref={(node) => {
        dialogRef.current = node;
        if (node && !node.open) node.showModal();
      }}
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-navy-deep/60"
      aria-labelledby="coffee-chat-title"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="coffee-chat-title" className="font-display text-xl font-bold text-navy">
              Coffee chat with {alum.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {[alum.position, alum.company].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <label htmlFor="coffee-note" className="mt-6 block text-sm font-medium text-ink">
          What do you want to ask about? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="coffee-note"
          value={note}
          maxLength={400}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. how they moved from engineering into product management"
          className="mt-2 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-navy"
        />
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="mt-3 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {pending ? "Drafting…" : result?.ok ? "Draft again" : "Draft email"}
        </button>

        {result && !result.ok && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {result.error}
          </p>
        )}

        {result?.ok && (
          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-ink">
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line p-3 text-sm font-normal outline-none focus:border-navy"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Email
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-lg border border-line p-3 text-sm font-normal leading-relaxed outline-none focus:border-navy"
              />
            </label>
            <p className="text-xs text-muted">Read it over and make it sound like you before sending.</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={mailto}
                className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy hover:brightness-110"
              >
                Open in email
              </a>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
                  setCopied(true);
                }}
                className="rounded-full border border-navy px-5 py-2.5 text-sm font-semibold text-navy"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
