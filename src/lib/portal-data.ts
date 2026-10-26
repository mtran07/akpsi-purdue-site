import "server-only";
import type { Alumnus, Member, Resource } from "@/lib/portal-types";

/*
  Raw access to the portal's Google Sheet, through the Apps Script web app in
  apps-script/portal.gs. The script URL and key live only in Vercel's
  environment variables, so neither ever reaches a browser.

  Do NOT call these from pages or components. Go through src/lib/dal.ts,
  which checks that the visitor is a signed-in member first.
*/

type ScriptAction = "members" | "alumni" | "resources";
type ScriptResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export function isPortalConfigured() {
  return Boolean(
    process.env.PORTAL_SCRIPT_URL &&
      process.env.PORTAL_SCRIPT_KEY &&
      process.env.AUTH_SECRET &&
      process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET,
  );
}

async function callScript<T>(action: ScriptAction): Promise<T> {
  const base = process.env.PORTAL_SCRIPT_URL;
  const key = process.env.PORTAL_SCRIPT_KEY;
  if (!base || !key) throw new Error("Portal data source is not configured.");

  const url = new URL(base);
  url.searchParams.set("action", action);
  url.searchParams.set("key", key);

  // Apps Script answers with a redirect to googleusercontent.com; fetch follows it.
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Portal data source responded ${res.status}.`);

  const body = (await res.json()) as ScriptResponse<T>;
  if (!body.ok) throw new Error(`Portal data source error: ${body.error}`);
  return body.data;
}

/*
  The member allowlist, cached in this module for 60 seconds so every page
  view doesn't hit Apps Script. Removing someone from the sheet takes effect
  within a minute.

  Deliberately NOT a `"use cache"` function: Next registers those as callable
  server references, and the roster must never be returnable to a caller.
  The only export is a single-email lookup.
*/
const MEMBERS_TTL_MS = 60_000;
let memberCache: { at: number; byEmail: Map<string, Member> } | null = null;
let memberRefresh: Promise<Map<string, Member>> | null = null;

async function loadMembers(): Promise<Map<string, Member>> {
  if (memberCache && Date.now() - memberCache.at < MEMBERS_TTL_MS) return memberCache.byEmail;

  // Share one in-flight refresh between concurrent requests.
  memberRefresh ??= callScript<Member[]>("members")
    .then((members) => {
      const byEmail = new Map(
        members.map((m) => [m.email.trim().toLowerCase(), { ...m, email: m.email.trim().toLowerCase() }]),
      );
      memberCache = { at: Date.now(), byEmail };
      return byEmail;
    })
    .finally(() => {
      memberRefresh = null;
    });

  // If the refresh fails, throw rather than fall back to a stale list (fail closed).
  return memberRefresh;
}

/** The member record for this email, or null if they're not on the Members tab. */
export async function findMember(email: string): Promise<Member | null> {
  const members = await loadMembers();
  return members.get(email.trim().toLowerCase()) ?? null;
}

/** Alumni directory rows. Fetched fresh on each request, never cached. */
export async function fetchAlumni(): Promise<Alumnus[]> {
  return callScript<Alumnus[]>("alumni");
}

/** Brother-only links (Drive folders, calendar, docs). Fetched fresh. */
export async function fetchResources(): Promise<Resource[]> {
  return callScript<Resource[]>("resources");
}
