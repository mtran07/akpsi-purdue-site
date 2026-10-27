"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { draftCoffeeChat, type DraftResult } from "@/app/portal/actions";
import { AlumniInsights } from "@/components/portal/alumni-insights";
import { enrich, initials, milesBetween, stateRank, type AlumRow } from "@/lib/alumni-utils";
import type { Alumnus } from "@/lib/portal-types";

// Leaflet only loads when someone opens the Map view.
const AlumniMap = dynamic(() => import("@/components/portal/alumni-map").then((m) => m.AlumniMap), {
  ssr: false,
  loading: () => <div className="h-[60vh] min-h-[360px] animate-pulse rounded-xl bg-paper-alt" />,
});

type View = "cards" | "list" | "map" | "insights";
type SortKey = "name" | "location" | "position" | "company" | "sector" | "year";

const NEAR_ME_MILES = 50;

const VIEWS: { id: View; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "list", label: "List" },
  { id: "map", label: "Map" },
  { id: "insights", label: "Insights" },
];

const uniqueSorted = (values: (string | undefined)[]) =>
  [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));

export function AlumniDirectory({ alumni, canDraft }: { alumni: Alumnus[]; canDraft: boolean }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const rows = useMemo(() => alumni.map(enrich), [alumni]);

  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [view, setView] = useState<View>("cards");
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [drafting, setDrafting] = useState<AlumRow | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  // Filter options come from the data itself.
  const options = useMemo(
    () => ({
      states: uniqueSorted(rows.map((r) => r.state)).sort((a, b) => stateRank(a) - stateRank(b)),
      cities: uniqueSorted(rows.filter((r) => !state || r.state === state).map((r) => r.city)),
      sectors: uniqueSorted(rows.map((r) => r.sectorGroup)),
      years: uniqueSorted(rows.map((r) => r.year)).reverse(),
      majors: uniqueSorted(rows.map((r) => r.majorGroup)),
    }),
    [rows, state],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (state && r.state !== state) return false;
        if (city && r.city !== city) return false;
        if (sector && r.sectorGroup !== sector) return false;
        if (year && r.year !== year) return false;
        if (major && r.majorGroup !== major) return false;
        if (me && (!r.coords || milesBetween(me, r.coords) > NEAR_ME_MILES)) return false;
        if (deferredQuery) {
          const haystack = [r.name, r.company, r.position, r.sector, r.location, r.major, r.prevCompanies]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!deferredQuery.split(/\s+/).every((word) => haystack.includes(word))) return false;
        }
        return true;
      }),
    [rows, state, city, sector, year, major, me, deferredQuery],
  );

  const clearAll = () => {
    setQuery("");
    setState("");
    setCity("");
    setSector("");
    setYear("");
    setMajor("");
    setMe(null);
  };
  const anyFilter = query || state || city || sector || year || major || me;
  const activeFilters = [state, city, sector, year, major].filter(Boolean).length;
  const [showFilters, setShowFilters] = useState(false);

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't share location.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setMe([pos.coords.latitude, pos.coords.longitude]);
        setView("map");
      },
      () => {
        setLocating(false);
        setLocateError("Couldn't get your location. Allow location access and try again.");
      },
      { timeout: 15_000 },
    );
  };

  const onCoffeeChat = canDraft ? (alum: AlumRow) => setDrafting(alum) : undefined;

  return (
    <div>
      {/* Filters */}
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
          <Field label="Search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, company, position…"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </Field>
          {/* On phones the five dropdowns fold behind a button so results stay near the top. */}
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((s) => !s)}
            className="justify-self-start text-sm font-medium text-navy md:hidden"
          >
            {showFilters ? "Hide filters ▴" : `Filters${activeFilters ? ` (${activeFilters})` : ""} ▾`}
          </button>
          <div className={`${showFilters ? "grid" : "hidden"} gap-3 md:contents`}>
          <Select
            label="State"
            value={state}
            all="All states"
            options={options.states}
            onChange={(v) => {
              setState(v);
              setCity("");
            }}
          />
          <Select label="City" value={city} all="All cities" options={options.cities} onChange={setCity} />
          <Select label="Sector" value={sector} all="All sectors" options={options.sectors} onChange={setSector} />
          <Select label="Grad year" value={year} all="Any year" options={options.years} onChange={setYear} />
          <Select label="Major" value={major} all="All majors" options={options.majors} onChange={setMajor} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="View" className="flex rounded-full border border-line p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === v.id ? "bg-navy text-white" : "text-muted hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={me ? () => setMe(null) : findNearMe}
            disabled={locating}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              me ? "border-gold bg-gold-soft text-navy" : "border-line text-muted hover:text-ink"
            }`}
          >
            {locating ? "Locating…" : me ? `Near me (${NEAR_ME_MILES} mi) ✕` : "Near me"}
          </button>
          {anyFilter && (
            <button type="button" onClick={clearAll} className="px-2 text-sm font-medium text-navy hover:underline">
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            className="ml-auto px-2 text-sm text-muted hover:text-ink"
          >
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
        {locateError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {locateError}
          </p>
        )}
      </div>

      <StatsLine shown={filtered} total={rows.length} />

      <div className="mt-6">
        {view === "cards" && <CardsView alumni={filtered} grouped={!state} onCoffeeChat={onCoffeeChat} />}
        {view === "list" && <ListView alumni={filtered} />}
        {view === "map" && <AlumniMap alumni={filtered} me={me} onCoffeeChat={onCoffeeChat} />}
        {view === "insights" && <AlumniInsights alumni={filtered} />}
      </div>

      {drafting && <CoffeeChatDialog alum={drafting} onClose={() => setDrafting(null)} />}
    </div>
  );
}

/* ---------------- Controls ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

function Select(props: {
  label: string;
  value: string;
  all: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
      >
        <option value="">{props.all}</option>
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function StatsLine({ shown, total }: { shown: AlumRow[]; total: number }) {
  const states = new Set(shown.map((a) => a.state).filter((s) => s && s !== "Other")).size;
  const companies = new Set(shown.map((a) => a.company).filter(Boolean)).size;
  const sectors = new Set(shown.map((a) => a.sectorGroup).filter(Boolean)).size;
  return (
    <p className="mt-4 text-sm text-muted" aria-live="polite">
      <span className="font-semibold text-ink">
        {shown.length === total ? `${total} alumni` : `${shown.length} of ${total} alumni`}
      </span>
      {" · "}
      {states} states/regions · {companies} companies · {sectors} sectors
    </p>
  );
}

/* ---------------- Cards ---------------- */

function CardsView({
  alumni,
  grouped,
  onCoffeeChat,
}: {
  alumni: AlumRow[];
  grouped: boolean;
  onCoffeeChat?: (alum: AlumRow) => void;
}) {
  if (alumni.length === 0) return <p className="py-16 text-center text-muted">No alumni match those filters.</p>;

  if (!grouped) return <CardGrid alumni={alumni} onCoffeeChat={onCoffeeChat} />;

  const groups = new Map<string, AlumRow[]>();
  for (const a of alumni) {
    const key = a.state || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const ordered = [...groups].sort(
    ([a, aa], [b, bb]) => stateRank(a) - stateRank(b) || bb.length - aa.length || a.localeCompare(b),
  );

  return (
    <div className="space-y-10">
      {ordered.map(([stateName, members]) => (
        <section key={stateName} aria-labelledby={`state-${stateName}`}>
          <h3 id={`state-${stateName}`} className="font-display text-xl font-bold text-navy">
            {stateName} <span className="font-sans text-sm font-normal text-muted">({members.length})</span>
          </h3>
          <div className="mt-4">
            <CardGrid alumni={members} onCoffeeChat={onCoffeeChat} />
          </div>
        </section>
      ))}
    </div>
  );
}

function CardGrid({ alumni, onCoffeeChat }: { alumni: AlumRow[]; onCoffeeChat?: (alum: AlumRow) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {alumni.map((a) => (
        <AlumCard key={a.id} alum={a} onCoffeeChat={onCoffeeChat} />
      ))}
    </ul>
  );
}

function AlumCard({ alum: a, onCoffeeChat }: { alum: AlumRow; onCoffeeChat?: (alum: AlumRow) => void }) {
  const [open, setOpen] = useState(false);
  const hasCareer = Boolean(a.company || a.prevList.length);

  return (
    <li className="flex flex-col rounded-xl border border-line bg-white p-5">
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold"
        >
          {initials(a.name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{a.name}</p>
          <p className="text-xs text-muted">
            {[a.year && `Class of ${a.year}`, a.major?.split(",")[0]].filter(Boolean).join(" · ")}
          </p>
          {a.sectorGroup && (
            <span className="mt-1.5 inline-block rounded-full bg-paper-alt px-2.5 py-0.5 text-xs font-medium text-navy">
              {a.sectorGroup}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {(a.position || a.company) && <p className="text-ink">{[a.position, a.company].filter(Boolean).join(" · ")}</p>}
        {a.location && <p className="text-muted">{a.location}</p>}
        {!a.position && !a.company && !a.location && <p className="italic text-muted">No details on file</p>}
      </div>

      {hasCareer && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-semibold uppercase tracking-wider text-gold hover:text-navy"
          >
            {open ? "▴ Hide career path" : "▾ Career path"}
          </button>
          {open && (
            <ol className="mt-3 space-y-2 border-l-2 border-line pl-4 text-sm">
              {a.company && (
                <li className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-white" />
                  <span className="font-medium text-ink">{a.company}</span>
                  {a.position && <span className="block text-xs text-muted">{a.position} · current</span>}
                </li>
              )}
              {a.prevList.map((p) => (
                <li key={p} className="relative text-muted">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-line ring-2 ring-white" />
                  {p}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-2 border-t border-line pt-4 text-sm font-medium">
          {onCoffeeChat && (
            <button
              type="button"
              onClick={() => onCoffeeChat(a)}
              className="rounded-full bg-navy px-3.5 py-1.5 text-white hover:bg-navy-deep"
            >
              Coffee chat
            </button>
          )}
          {a.email && (
            <a href={`mailto:${a.email}`} className="rounded-full border border-line px-3.5 py-1.5 text-navy hover:border-navy">
              Email
            </a>
          )}
          {a.linkedin && (
            <a
              href={a.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3.5 py-1.5 text-navy hover:border-navy"
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------------- List ---------------- */

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "location", label: "Location" },
  { key: "position", label: "Position" },
  { key: "company", label: "Company" },
  { key: "sector", label: "Sector" },
  { key: "year", label: "Class" },
];

function sortValue(a: AlumRow, key: SortKey) {
  switch (key) {
    case "name": {
      const parts = a.name.split(/\s+/);
      return `${parts[parts.length - 1]} ${a.name}`;
    }
    case "location":
      return a.location ?? "";
    case "position":
      return a.position ?? "";
    case "company":
      return a.company ?? "";
    case "sector":
      return a.sectorGroup;
    case "year":
      return a.year ?? "";
  }
}

function ListView({ alumni }: { alumni: AlumRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState(1);

  const sorted = useMemo(
    () =>
      [...alumni].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (!av && bv) return 1; // blanks last
        if (av && !bv) return -1;
        return av.localeCompare(bv) * dir;
      }),
    [alumni, sortKey, dir],
  );

  if (alumni.length === 0) return <p className="py-16 text-center text-muted">No alumni match those filters.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-paper-alt text-xs uppercase tracking-wider text-muted">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sortKey === c.key ? (dir === 1 ? "ascending" : "descending") : "none"}
                className="px-4 py-3 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (sortKey === c.key) setDir((d) => -d);
                    else {
                      setSortKey(c.key);
                      setDir(1);
                    }
                  }}
                  className="uppercase tracking-wider hover:text-ink"
                >
                  {c.label}
                  {sortKey === c.key ? (dir === 1 ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
            <th scope="col" className="px-4 py-3 font-semibold">
              Links
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((a) => (
            <tr key={a.id} className="hover:bg-paper-alt/60">
              <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
              <td className="px-4 py-3 text-muted">{a.location || "—"}</td>
              <td className="px-4 py-3">{a.position || "—"}</td>
              <td className="px-4 py-3">{a.company || "—"}</td>
              <td className="px-4 py-3 text-muted">{a.sectorGroup || "—"}</td>
              <td className="px-4 py-3 tabular-nums text-muted">{a.year || "—"}</td>
              <td className="space-x-3 whitespace-nowrap px-4 py-3 font-medium">
                {a.linkedin && (
                  <a href={a.linkedin} target="_blank" rel="noreferrer" className="text-navy hover:underline">
                    LinkedIn
                  </a>
                )}
                {a.email && (
                  <a href={`mailto:${a.email}`} className="text-navy hover:underline">
                    Email
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Coffee chat ---------------- */

function CoffeeChatDialog({ alum, onClose }: { alum: AlumRow; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<DraftResult | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      const draft = await draftCoffeeChat(alum.id, note, { gradYear, major });
      setResult(draft);
      if (draft.ok) {
        setSubject(draft.subject);
        setBody(draft.body);
        setCopied(false);
      }
    });

  const mailto = alum.email
    ? `mailto:${alum.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;
  const input = "mt-1 w-full rounded-lg border border-line p-2.5 text-sm font-normal outline-none focus:border-navy";

  return (
    <dialog
      ref={(node) => {
        dialogRef.current = node;
        if (node && !node.open) node.showModal();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close(); // click outside closes
      }}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-navy-deep/60"
      aria-labelledby="coffee-chat-title"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="coffee-chat-title" className="font-display text-xl font-bold text-navy">
              Coffee chat with {alum.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{[alum.position, alum.company].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} className="text-sm font-medium text-muted hover:text-ink">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Your grad year <span className="font-normal text-muted">(optional)</span>
            <input value={gradYear} maxLength={20} onChange={(e) => setGradYear(e.target.value)} placeholder="2028" className={input} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Your major <span className="font-normal text-muted">(optional)</span>
            <input value={major} maxLength={60} onChange={(e) => setMajor(e.target.value)} placeholder="Finance" className={input} />
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium text-ink">
          What do you want to talk about?
          <textarea
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. how they moved from engineering into product management"
            className={input}
          />
        </label>
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
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
            </label>
            <label className="block text-sm font-medium text-ink">
              Email
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${input} leading-relaxed`} />
            </label>
            <p className="text-xs text-muted">Read it over and make it sound like you before sending.</p>
            <div className="flex flex-wrap gap-3">
              {mailto && (
                <a href={mailto} className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy hover:brightness-110">
                  Open in email
                </a>
              )}
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
