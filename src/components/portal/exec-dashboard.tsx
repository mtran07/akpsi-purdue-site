import type { ExecDashboard, Officer } from "@/lib/portal-types";
import { NamesToggle, Private, PrivateNamesProvider } from "@/components/portal/private-names";
import { AccessRequestActions } from "@/components/portal/access-request-actions";

// Exec dashboard (officers only). Everything comes from the portal sheet and
// the secretary's points table; see apps-script/portal.gs, handleDashboard_.

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1);

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-navy">{title}</h2>
        {action && action.href && (
          <a href={action.href} target="_blank" rel="noreferrer" className="text-sm font-medium text-navy underline underline-offset-4">
            {action.label} ↗
          </a>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function Attendance({ meetings }: { meetings: NonNullable<ExecDashboard["points"]>["meetings"] }) {
  const marked = meetings.filter((m) => m.present + m.excused + m.unexcused > 0);
  if (marked.length === 0) return <Empty>No chapter attendance marked yet.</Empty>;
  return (
    <div>
      <ul className="space-y-3">
        {marked.map((m, i) => {
          const total = m.present + m.excused + m.unexcused;
          const pct = (n: number) => `${(n / total) * 100}%`;
          return (
            <li key={`${m.date}-${i}`} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-muted">{m.date || m.name}</span>
              <div
                className="flex h-4 overflow-hidden rounded-full bg-paper-alt"
                role="img"
                aria-label={`${m.date}: ${m.present} present, ${m.excused} excused, ${m.unexcused} unexcused`}
              >
                <div className="bg-green-600" style={{ width: pct(m.present) }} />
                <div className="bg-amber-400" style={{ width: pct(m.excused) }} />
                <div className="bg-red-500" style={{ width: pct(m.unexcused) }} />
              </div>
              <span className="text-right font-medium text-ink">{Math.round((m.present / total) * 100)}%</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Present</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Excused</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Unexcused</span>
        <span>Percent = present</span>
      </div>
    </div>
  );
}

export function ExecDashboardView({ officer, data }: { officer: Officer; data: ExecDashboard }) {
  const points = data.points;
  const pending = data.members.pending;
  const undecided = data.excusals.filter((e) => !e.decision.trim()).length;
  const lastMeeting = points?.meetings.filter((m) => m.present + m.excused + m.unexcused > 0).at(-1);
  const lastRate = lastMeeting
    ? Math.round((lastMeeting.present / (lastMeeting.present + lastMeeting.excused + lastMeeting.unexcused)) * 100)
    : null;

  return (
    <PrivateNamesProvider>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{officer.name || officer.email}</span>
          {officer.position && <> · {officer.position}</>}
        </p>
        <NamesToggle />
      </div>

      <a
        href="/portal/exec/check-in"
        className="flex items-center justify-between gap-6 rounded-xl bg-navy p-5 text-white transition hover:bg-navy-deep"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Chapter check-in</p>
          <p className="mt-1 font-display text-xl font-bold">Start the QR check-in for chapter</p>
        </div>
        <span aria-hidden className="text-2xl text-gold">→</span>
      </a>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Portal access" value={String(data.members.activeEmails)} hint="active emails on Members" />
        <Tile label="Waiting for approval" value={String(pending.length)} hint={pending.length ? "access requests" : "all caught up"} />
        <Tile
          label="Mid-semester goal"
          value={points ? `${points.metMid}/${points.brothers}` : "–"}
          hint={points ? `brothers on track · avg ${fmt(points.average)} pts` : "points sheet not connected"}
        />
        <Tile
          label="Last chapter"
          value={lastRate === null ? "–" : `${lastRate}%`}
          hint={lastMeeting ? `attendance · ${lastMeeting.date}` : "no attendance yet"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Access requests" action={{ href: data.sheetUrl, label: "Members tab" }}>
          {pending.length === 0 ? (
            <Empty>No one is waiting. New requests show up here.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((p) => (
                <li key={p.email} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-ink">
                    <Private>
                      {p.name || "Unknown name"} <span className="font-normal text-muted">· {p.email}</span>
                    </Private>
                  </p>
                  {p.note && (
                    <p className="mt-0.5 text-sm text-muted">
                      <Private>{p.note}</Private>
                    </p>
                  )}
                  <AccessRequestActions email={p.email} name={p.name} />
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && (
            <p className="mt-4 text-xs text-muted">Approving sends them a welcome email with the sign-in link. You can also change Status to Active on the Members tab.</p>
          )}
        </Panel>

        <Panel title="Chapter attendance" action={points ? { href: points.sheetUrl, label: "Points sheet" } : undefined}>
          {points ? <Attendance meetings={points.meetings} /> : <Empty>Connect the points sheet (POINTS_SHEET_ID) to see attendance.</Empty>}
        </Panel>

        <Panel title="Behind on points" action={points ? { href: points.sheetUrl, label: "Points sheet" } : undefined}>
          {!points ? (
            <Empty>Connect the points sheet to see who&apos;s behind.</Empty>
          ) : points.behind.length === 0 ? (
            <Empty>Everyone has reached their mid-semester goal.</Empty>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                {points.behind.length} {points.behind.length === 1 ? "brother is" : "brothers are"} under their mid-semester goal.
              </p>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-paper-alt text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Brother</th>
                      <th className="px-3 py-2 text-right font-semibold">Points</th>
                      <th className="px-3 py-2 text-right font-semibold">Mid goal</th>
                      <th className="px-3 py-2 text-right font-semibold">Goal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {points.behind.map((b) => (
                      <tr key={b.name}>
                        <td className="px-3 py-2 text-ink">
                          <Private>{b.name}</Private>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-red-700">{fmt(b.total)}</td>
                        <td className="px-3 py-2 text-right text-muted">{fmt(b.mid)}</td>
                        <td className="px-3 py-2 text-right text-muted">{fmt(b.goal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Recent excusal requests" action={{ href: data.sheetUrl, label: "Excusals tab" }}>
          {data.excusals.length === 0 ? (
            <Empty>No excusal requests yet.</Empty>
          ) : (
            <>
              {undecided > 0 && (
                <p className="mb-3 text-sm text-muted">
                  {undecided} without a decision. Reasons are in the secretary&apos;s email and the Excusals tab.
                </p>
              )}
              <ul className="divide-y divide-line">
                {data.excusals.slice(0, 10).map((e, i) => (
                  <li key={`${e.submitted}-${i}`} className="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-ink">
                        <Private>{e.name}</Private>
                      </p>
                      <p className="text-muted">
                        {e.event}
                        {e.eventDate && ` · ${e.eventDate}`}
                        {e.proof === "Yes" && " · proof attached"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        e.decision.trim()
                          ? "bg-green-50 text-green-800 ring-green-600/20"
                          : "bg-amber-50 text-amber-800 ring-amber-600/20"
                      }`}
                    >
                      {e.decision.trim() || "Undecided"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Website messages" action={{ href: data.sheetUrl, label: "Contact tab" }}>
        {data.contact.length === 0 ? (
          <Empty>No messages from the contact form yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data.contact.map((c, i) => (
              <li key={`${c.received}-${i}`} className="py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">
                    <Private>{c.name}</Private> <span className="font-normal text-muted">· {c.topic}</span>
                  </p>
                  {c.handledBy ? (
                    <span className="text-xs text-green-700">Handled by <Private>{c.handledBy}</Private></span>
                  ) : (
                    <a href={`mailto:${c.email}`} className="text-xs font-medium text-navy underline underline-offset-4">
                      Reply to <Private>{c.email}</Private>
                    </a>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-muted">
                  <Private>{c.message}</Private>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
    </PrivateNamesProvider>
  );
}
