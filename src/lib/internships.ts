import "server-only";

/*
  Open internships from SimplifyJobs' community-maintained list
  (github.com/SimplifyJobs/Summer2027-Internships). The full file is ~13 MB,
  so the server downloads it at most once an hour per instance and keeps
  only open, visible listings for the target term, trimmed to what the page
  shows (a few hundred KB).
*/

const SOURCE =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";
export const INTERNSHIP_TERM = "Summer 2027";
export const INTERNSHIP_REPO = "https://github.com/SimplifyJobs/Summer2027-Internships";
const TTL_MS = 60 * 60 * 1000;

export type Internship = {
  id: string;
  company: string;
  title: string;
  category: string;
  locations: string;
  /** Unix seconds. */
  posted: number;
  url: string;
};

type RawListing = {
  id?: string;
  company_name?: string;
  title?: string;
  category?: string;
  locations?: string[];
  terms?: string[];
  date_posted?: number;
  url?: string;
  active?: boolean;
  is_visible?: boolean;
};

const CATEGORY_NAMES: Record<string, string> = {
  "Software Engineering": "Software",
  "AI/ML/Data": "AI / ML / Data",
};

let cache: { at: number; data: Promise<Internship[]> } | null = null;

export function getInternships(): Promise<Internship[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const data = load();
  cache = { at: Date.now(), data };
  // A failed download shouldn't stick for an hour.
  data.catch(() => (cache = null));
  return data;
}

async function load(): Promise<Internship[]> {
  // Too big for Next's fetch cache (2 MB limit); cached in memory above instead.
  const res = await fetch(SOURCE, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Internship list returned ${res.status}`);
  const raw = (await res.json()) as RawListing[];
  const out: Internship[] = [];
  for (const x of raw) {
    if (!x.active || x.is_visible === false || !x.url || !x.company_name || !x.title) continue;
    if (!x.terms?.includes(INTERNSHIP_TERM)) continue;
    if (!/^https:\/\//.test(x.url)) continue;
    out.push({
      id: x.id ?? `${x.company_name}-${x.title}-${x.date_posted}`,
      company: x.company_name.trim(),
      title: x.title.trim(),
      category: CATEGORY_NAMES[x.category ?? ""] ?? x.category ?? "Other",
      locations: (x.locations ?? []).slice(0, 4).join(" · ") + ((x.locations?.length ?? 0) > 4 ? ` +${x.locations!.length - 4}` : ""),
      posted: x.date_posted ?? 0,
      url: x.url,
    });
  }
  return out.sort((a, b) => b.posted - a.posted);
}

/** "Goldman Sachs & Co. LLC" and "goldman sachs" both become "goldmansachs". */
export function companyKey(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|plc|lp|llp|group|holdings|the)\b\.?/g, " ")
    .replace(/[^a-z0-9]/g, "");
}
