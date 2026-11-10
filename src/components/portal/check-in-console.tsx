"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addByHand,
  applyToPoints,
  closeCheckin,
  getLiveCheckin,
  getPointsColumns,
  removeFromCheckin,
  startCheckin,
  type LiveCheckin,
} from "@/app/portal/exec/check-in/actions";
import type { CheckinApplyResult } from "@/lib/portal-types";

const POLL_MS = 4_000;
const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis", hour: "numeric", minute: "2-digit" });
const fmt = (ms: number) => timeFormat.format(new Date(ms));
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Brother = { name: string; email: string };

export function CheckInConsole({ initial, brothers }: { initial: LiveCheckin; brothers: Brother[] }) {
  const [live, setLive] = useState(initial);
  const [skew, setSkew] = useState(() => initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const accept = useCallback((next: LiveCheckin) => {
    const t = Date.now();
    setLive(next);
    setSkew(next.serverNow - t);
    setNow(t);
  }, []);

  // Poll for new check-ins and the next codes; tick every second for the countdown.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      getLiveCheckin().then(accept).catch(() => {});
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [accept]);

  const serverNow = now + skew;
  const session = live.session;
  const open = !!session && !session.closed && serverNow < session.closesAt;
  const code = live.codes.find((c) => serverNow >= c.from && serverNow < c.until) ?? live.codes[0];

  function run(fn: () => Promise<LiveCheckin>) {
    setError("");
    startTransition(async () => {
      try {
        accept(await fn());
      } catch {
        setError("That didn't go through. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {open && session && code ? (
        <Projector
          event={session.event}
          date={session.date}
          code={code.code}
          sessionId={session.id}
          secondsToNext={code.until - serverNow}
          closesIn={session.closesAt - serverNow}
          closesAt={session.closesAt}
          usesLocation={session.usesLocation}
          onClose={() => run(closeCheckin)}
          busy={pending}
        />
      ) : (
        <StartForm
          busy={pending}
          lastSession={session ? `${session.event} · ${session.date} (closed ${fmt(Math.min(session.closesAt, serverNow))})` : null}
          onStart={(input) => run(() => startCheckin(input))}
          onError={setError}
        />
      )}

      {session && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CheckedInList
            live={live}
            brothers={brothers}
            busy={pending}
            onRemove={(email, name) => run(() => removeFromCheckin(session.id, email, name))}
            onAdd={(name, email) => run(() => addByHand(session.id, name, email))}
          />
          <ApplyPanel sessionId={session.id} count={live.checkins.length} stillOpen={open} />
        </div>
      )}
    </div>
  );
}

function Projector(props: {
  event: string;
  date: string;
  code: string;
  sessionId: string;
  secondsToNext: number;
  closesIn: number;
  closesAt: number;
  usesLocation: boolean;
  onClose: () => void;
  busy: boolean;
}) {
  const [qr, setQr] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const url = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/api/check-in?s=${encodeURIComponent(props.sessionId)}&c=${encodeURIComponent(props.code)}`;
  }, [props.sessionId, props.code]);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: "#0b2545", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  return (
    <div ref={boxRef} className="rounded-2xl bg-navy-deep p-6 text-white sm:p-8 [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center">
      <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[22rem] rounded-2xl bg-white p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated QR code
            <img src={qr} alt="Check-in QR code" className="aspect-square w-full" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-lg bg-navy/10" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            {props.event} · {props.date}
          </p>
          <p className="mt-2 font-display text-4xl font-bold">Scan to check in</p>
          <p className="mt-3 text-white/80">
            Open your phone camera and point it at the code. You&apos;ll need to be signed in to the brother portal.
            {props.usesLocation && " Your phone will ask to share your location once."}
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
            <div className="h-full bg-gold transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (props.secondsToNext / 30_000) * 100)}%` }} />
          </div>
          <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-white/75 tabular-nums">
            <span>New code in {Math.ceil(props.secondsToNext / 1000)}s</span>
            <span>
              Closes in {mmss(props.closesIn)} (at {fmt(props.closesAt)})
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => boxRef.current?.requestFullscreen?.().catch(() => {})}
              className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy hover:brightness-110"
            >
              Full screen for the projector
            </button>
            <button
              type="button"
              onClick={props.onClose}
              disabled={props.busy}
              className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold hover:border-white disabled:opacity-60"
            >
              Close check-in now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StartForm({
  busy,
  lastSession,
  onStart,
  onError,
}: {
  busy: boolean;
  lastSession: string | null;
  onStart: (input: { event: string; minutes: number; geo: { lat: number; lng: number } | null }) => void;
  onError: (message: string) => void;
}) {
  const [event, setEvent] = useState("Chapter");
  const [minutes, setMinutes] = useState(15);
  const [useLocation, setUseLocation] = useState(false);
  const [locating, setLocating] = useState(false);

  function start() {
    if (!useLocation) return onStart({ event, minutes, geo: null });
    if (!("geolocation" in navigator)) return onError("This device can't share its location. Turn off the location check.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onStart({ event, minutes, geo: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      },
      () => {
        setLocating(false);
        onError("Location is blocked on this device. Allow it for this site, or turn off the location check.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-navy">Start check-in</h2>
      {lastSession && <p className="mt-1 text-sm text-muted">Last check-in: {lastSession}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-medium text-ink">Event</span>
          <input
            id="checkin-event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-ink focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Check-in stays open for</span>
          <select
            id="checkin-minutes"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink"
          >
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-5 flex items-start gap-3">
        <input
          id="checkin-location"
          type="checkbox"
          checked={useLocation}
          onChange={(e) => setUseLocation(e.target.checked)}
          className="mt-1 h-4 w-4 accent-navy"
        />
        <span className="text-sm text-ink">
          Location check
          <span className="block text-muted">
            Brothers must be within about 300 m of where you are now. Start it from the meeting room.
          </span>
        </span>
      </label>
      <button
        type="button"
        onClick={start}
        disabled={busy || locating}
        className="mt-6 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
      >
        {locating ? "Getting this room's location…" : busy ? "Starting…" : "Start check-in"}
      </button>
    </div>
  );
}

function CheckedInList({
  live,
  brothers,
  busy,
  onRemove,
  onAdd,
}: {
  live: LiveCheckin;
  brothers: Brother[];
  busy: boolean;
  onRemove: (email: string, name: string) => void;
  onAdd: (name: string, email: string) => void;
}) {
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const checked = useMemo(() => [...live.checkins].sort((a, b) => b.at - a.at), [live.checkins]);
  const inList = new Set(live.checkins.map((c) => (c.email || c.name).toLowerCase()));
  const options = brothers.filter((b) => !inList.has((b.email || b.name).toLowerCase()) && !inList.has(b.name.toLowerCase()));

  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-navy">
        Checked in <span className="font-sans text-base font-normal text-muted">· {checked.length}</span>
      </h2>
      {checked.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No one yet. New check-ins appear here within a few seconds.</p>
      ) : (
        <ul className="mt-4 max-h-96 divide-y divide-line overflow-y-auto">
          {checked.map((c) => {
            const key = c.email || c.name;
            return (
              <li key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{c.name}</span>
                  {c.method !== "Scan" && <span className="text-muted"> · added by hand</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums text-muted">{fmt(c.at)}</span>
                  {confirm === key ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => { setConfirm(null); onRemove(c.email, c.name); }} className="text-xs font-semibold text-red-700 underline">
                        Remove
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className="text-xs text-muted underline">
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirm(key)} className="text-xs text-muted underline hover:text-red-700">
                      Remove
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-medium text-ink">Add someone by hand</p>
        <p className="text-xs text-muted">For a dead phone or a late arrival. Works after check-in closes too.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            id="checkin-manual"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">Choose a brother</option>
            {options.map((b) => (
              <option key={b.email || b.name} value={b.email || b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={() => {
              const b = brothers.find((x) => (x.email || x.name) === pick);
              if (b) onAdd(b.name, b.email);
              setPick("");
            }}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}

function ApplyPanel({ sessionId, count, stillOpen }: { sessionId: string; count: number; stillOpen: boolean }) {
  const [columns, setColumns] = useState<{ col: number; name: string; date: string }[] | null>(null);
  const [col, setCol] = useState<number | "">("");
  const [markRest, setMarkRest] = useState(false);
  const [result, setResult] = useState<CheckinApplyResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getPointsColumns()
      .then((cols) => {
        setColumns(cols);
        // Suggest today's Chapter column (dates on the sheet look like 11/10).
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis", month: "numeric", day: "numeric" }).format(new Date());
        const today = cols.find((c) => c.date.split(/[-–]/)[0].trim() === parts && /chapter/i.test(c.name)) ?? cols.find((c) => c.date.split(/[-–]/)[0].trim() === parts);
        if (today) setCol(today.col);
      })
      .catch(() => setColumns([]));
  }, []);

  function apply() {
    if (col === "") return;
    setError("");
    setResult(null);
    startTransition(async () => {
      const r = await applyToPoints(sessionId, col, markRest);
      if (r.ok) setResult(r.result);
      else setError(r.error);
    });
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-navy">Apply to the points table</h2>
      <p className="mt-1 text-sm text-muted">
        Turns each checked-in brother&apos;s cell Present. Cells already Excused or Out of Chapter are never changed.
        {stillOpen && " You can apply now and again after check-in closes."}
      </p>

      {columns === null ? (
        <p className="mt-4 text-sm text-muted">Loading the points table…</p>
      ) : columns.length === 0 ? (
        <p className="mt-4 text-sm text-muted">The points table isn&apos;t connected (POINTS_SHEET_ID).</p>
      ) : (
        <>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink">Column</span>
            <select
              id="checkin-column"
              value={col}
              onChange={(e) => setCol(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink"
            >
              <option value="">Choose the event column</option>
              {columns.map((c) => (
                <option key={c.col} value={c.col}>
                  {c.name}
                  {c.date ? ` · ${c.date}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 flex items-start gap-3">
            <input id="checkin-mark-rest" type="checkbox" checked={markRest} onChange={(e) => setMarkRest(e.target.checked)} className="mt-1 h-4 w-4 accent-navy" />
            <span className="text-sm text-ink">
              Mark everyone else Unexcused
              <span className="block text-muted">Only brothers whose cell is still empty. Leave this off to do it yourself.</span>
            </span>
          </label>
          <button
            type="button"
            onClick={apply}
            disabled={col === "" || pending || count === 0}
            className="mt-5 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Applying…" : `Apply ${count} check-in${count === 1 ? "" : "s"}`}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-600/20">
          <p className="font-semibold">
            Done: {result.present} marked Present
            {result.alreadyPresent ? `, ${result.alreadyPresent} already were` : ""}
            {result.unexcused ? `, ${result.unexcused} marked Unexcused` : ""}.
          </p>
          {result.skipped.length > 0 && <p className="mt-1">Left as Excused / Out of Chapter: {result.skipped.join(", ")}.</p>}
          {result.unmatched.length > 0 && (
            <p className="mt-1 text-red-800">Not found in the points table (mark these by hand): {result.unmatched.join(", ")}.</p>
          )}
        </div>
      )}
    </section>
  );
}
