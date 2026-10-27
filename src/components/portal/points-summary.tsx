import Link from "next/link";
import type { MyPoints, PointsStatus } from "@/lib/portal-types";

type Found = Extract<MyPoints, { found: true }>;

const STATUS: Record<PointsStatus, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-green-50 text-green-800 ring-green-600/20" },
  excused: { label: "Excused", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  unexcused: { label: "Unexcused", className: "bg-red-50 text-red-800 ring-red-600/20" },
  "ooc-involvement": { label: "Out of chapter (involvement)", className: "bg-sky-50 text-sky-800 ring-sky-600/20" },
  "ooc-required": { label: "Out of chapter (required)", className: "bg-violet-50 text-violet-800 ring-violet-600/20" },
};

const fmt = (n: number | null) => (n === null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1));

export function PointsSummary({ points }: { points: Found }) {
  const total = points.total ?? points.events.reduce((sum, e) => sum + (e.points ?? 0), 0);
  const goal = points.semesterGoal;
  const mid = points.midSemesterGoal;
  // The bar runs to the goal, or further if they're past it.
  const scale = Math.max(goal ?? 0, total, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  const remaining = goal !== null ? Math.max(0, goal - total) : null;

  const attendance = points.events.filter((e) => e.status);
  const counts = attendance.reduce<Partial<Record<PointsStatus, number>>>((acc, e) => {
    acc[e.status!] = (acc[e.status!] ?? 0) + 1;
    return acc;
  }, {});
  const earned = points.events.filter((e) => e.points !== null && e.points > 0);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="rounded-xl bg-navy p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">{points.name}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <p className="font-display text-5xl font-bold">{fmt(total)}</p>
          <p className="text-white/75">{goal !== null ? `of ${fmt(goal)} points this semester` : "points this semester"}</p>
        </div>

        {goal !== null && (
          <div className="mt-6">
            <div
              className="relative h-3 rounded-full bg-white/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={total}
              aria-label="Points toward semester goal"
            >
              <div className="h-3 rounded-full bg-gold" style={{ width: pct(total) }} />
              {mid !== null && mid < scale && (
                <div className="absolute -top-1 h-5 w-0.5 bg-white/80" style={{ left: pct(mid) }} aria-hidden />
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/70">
              <span>{mid !== null ? `Mid-semester goal: ${fmt(mid)}` : ""}</span>
              <span>Goal: {fmt(goal)}</span>
            </div>
            <p className="mt-4 font-medium">
              {remaining === 0
                ? "You've hit your semester goal."
                : `${fmt(remaining)} more ${remaining === 1 ? "point" : "points"} to reach your goal.`}
              {mid !== null && total < mid && ` (${fmt(mid - total)} to the mid-semester goal.)`}
            </p>
          </div>
        )}
      </div>

      {attendance.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-bold text-navy">Chapter attendance</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(STATUS) as PointsStatus[])
              .filter((s) => counts[s])
              .map((s) => (
                <span key={s} className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${STATUS[s].className}`}>
                  {STATUS[s].label}: {counts[s]}
                </span>
              ))}
          </div>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
            {attendance.map((e, i) => (
              <li key={`${e.name}-${e.date}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-ink">
                  {e.name}
                  {e.date && <span className="text-muted"> · {e.date}</span>}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS[e.status!].className}`}>
                  {STATUS[e.status!].label}
                </span>
              </li>
            ))}
          </ul>
          {counts.unexcused ? (
            <p className="mt-3 text-sm text-muted">
              Missing something you had a reason for?{" "}
              <Link href="/portal/excuse" className="font-medium text-navy underline underline-offset-4">
                Send an excusal request
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold text-navy">Points earned</h2>
        {earned.length === 0 ? (
          <p className="mt-4 text-muted">No points logged yet this semester.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
            {earned.map((e, i) => (
              <li key={`${e.name}-${e.date}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-ink">
                  {e.name}
                  {e.date && <span className="text-muted"> · {e.date}</span>}
                </span>
                <span className="shrink-0 font-semibold text-navy">+{fmt(e.points)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          Something look wrong? The secretary&apos;s points table is the source of truth. Reach out to them to fix it.
        </p>
      </div>
    </div>
  );
}
