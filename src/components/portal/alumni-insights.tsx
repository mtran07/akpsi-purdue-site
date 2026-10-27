import { topCounts, type AlumRow } from "@/lib/alumni-utils";

/**
 * Where the alumni in the current filter work and live. Each panel is a
 * ranked bar list: one quiet color, values written at the bar tips.
 */
export function AlumniInsights({ alumni }: { alumni: AlumRow[] }) {
  if (alumni.length === 0) return <p className="py-16 text-center text-muted">No alumni match those filters.</p>;

  const realStates = alumni.map((a) => a.state).filter((s) => s && s !== "Other");
  const stats = [
    { label: "Alumni", value: alumni.length },
    { label: "With a listed employer", value: alumni.filter((a) => a.company).length },
    { label: "States & regions", value: new Set(realStates).size },
    { label: "Companies", value: new Set(alumni.map((a) => a.company).filter(Boolean)).size },
    { label: "Sectors", value: new Set(alumni.map((a) => a.sectorGroup).filter(Boolean)).size },
  ];

  const years = topCounts(alumni.map((a) => a.year ?? ""), 100)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-white p-4">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-ink">{s.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <BarList title="Top companies" rows={topCounts(alumni.map((a) => a.company ?? ""))} />
        <BarList title="Top sectors" rows={topCounts(alumni.map((a) => a.sectorGroup))} />
        <BarList title="Top states" rows={topCounts(realStates)} />
        <BarList title="Top majors" rows={topCounts(alumni.map((a) => a.majorGroup))} />
        <BarList title="Alumni by graduation year" rows={years} note="Most recent 10 classes" />
      </div>
    </div>
  );
}

function BarList({ title, rows, note }: { title: string; rows: [string, number][]; note?: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h3 className="font-semibold text-ink">{title}</h3>
      {note && <p className="text-xs text-muted">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Not enough data.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {rows.map(([label, count]) => (
            <li
              key={label}
              className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm"
              title={`${label}: ${count} alumni`}
            >
              <span className="truncate text-ink">{label}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 rounded-r bg-navy"
                  style={{ width: `calc((100% - 2.75rem) * ${Math.max(0.02, count / max)})` }}
                  aria-hidden
                />
                <span className="shrink-0 tabular-nums text-muted">{count}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
