import "server-only";
import { cacheLife } from "next/cache";
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

/**
 * The member allowlist. Cached for a few minutes so every page view doesn't
 * hit Apps Script; removing someone from the sheet takes effect within minutes.
 * Never rendered: it's only used for the membership check.
 */
export async function fetchMembers(): Promise<Member[]> {
  "use cache";
  cacheLife("minutes");
  const members = await callScript<Member[]>("members");
  return members.map((m) => ({ ...m, email: m.email.trim().toLowerCase() }));
}

/** Alumni directory rows. Fetched fresh on each request, never cached. */
export async function fetchAlumni(): Promise<Alumnus[]> {
  return callScript<Alumnus[]>("alumni");
}

/** Brother-only links (Drive folders, calendar, docs). Fetched fresh. */
export async function fetchResources(): Promise<Resource[]> {
  return callScript<Resource[]>("resources");
}
