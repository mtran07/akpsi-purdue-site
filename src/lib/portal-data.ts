import "server-only";
import type { Alumnus, Brother, ChapterCalendar, Member, Resource } from "@/lib/portal-types";

/*
  Raw access to the portal's Google Sheet, through the Apps Script web app in
  apps-script/portal.gs. The script URL and key live only in Vercel's
  environment variables, so neither ever reaches a browser.

  Do NOT call these from pages or components. Go through src/lib/dal.ts,
  which checks that the visitor is a signed-in member first.
*/

type ScriptAction = "members" | "alumni" | "resources" | "events" | "brothers" | "roster";
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

export type AccessRequestResult = "pending" | "no-match" | "blocked" | "full";

/**
 * Someone signed in with a Google account that isn't on the Members tab typed
 * their full name. If it matches a brother on the roster, the script adds the
 * email to Members as "Pending" for an officer to approve. Never grants access.
 */
export async function requestAccess(email: string, name: string, googleName: string): Promise<AccessRequestResult> {
  const data = await postScript<{ result: AccessRequestResult }>("request", { email, name, googleName });
  return data.result;
}

/**
 * POST to the Apps Script (writes and anything carrying personal details), so
 * nothing ends up in a URL or a log. The key travels in the body.
 */
async function postScript<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const base = process.env.PORTAL_SCRIPT_URL;
  const key = process.env.PORTAL_SCRIPT_KEY;
  if (!base || !key) throw new Error("Portal data source is not configured.");

  // Apps Script's redirect is followed as a GET to fetch the result.
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, key, action }),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Portal data source responded ${res.status}.`);

  const body = (await res.json()) as ScriptResponse<T>;
  if (!body.ok) throw new Error(`Portal data source error: ${body.error}`);
  return body.data;
}

export type ProfileResult =
  | { found: false }
  | { found: true; saved?: boolean; error?: string; profile: Brother & { show: boolean } };

/** A brother's own Roster row, found by email (then name). Never cached. */
export async function fetchMyProfile(email: string, name: string): Promise<ProfileResult> {
  return postScript<ProfileResult>("profile", { email, name });
}

/** Saves a brother's own edits. The script re-checks which fields may change. */
export async function saveMyProfile(email: string, name: string, updates: Record<string, string | boolean>) {
  const result = await postScript<ProfileResult>("profile", { email, name, updates });
  contentCache.delete("brothers"); // show the change in the directory right away
  return result;
}

export type Excusal = {
  email: string;
  name: string;
  event: string;
  eventDate: string;
  reason: string;
  proof: { type: string; data: string } | null;
};

/** Emails an excusal request to the secretary (with proof attached) and logs it. */
export async function sendExcusal(excusal: Excusal): Promise<void> {
  await postScript<{ sent: boolean }>("excuse", excusal);
}

/*
  Alumni, resources and events change rarely, and each Apps Script call takes
  a second or more, so they're kept in this server's memory for a few minutes.
  Same rules as the member list: private to this module (never "use cache"),
  and every caller goes through dal.ts, which checks membership first.
  An edit to the sheet or calendar shows up within CONTENT_TTL_MS.
*/
const CONTENT_TTL_MS = 5 * 60_000;
const contentCache = new Map<ScriptAction, { at: number; data: unknown }>();
const contentRefresh = new Map<ScriptAction, Promise<unknown>>();

function cachedScript<T>(action: ScriptAction): Promise<T> {
  const hit = contentCache.get(action);
  if (hit && Date.now() - hit.at < CONTENT_TTL_MS) return Promise.resolve(hit.data as T);

  let refresh = contentRefresh.get(action) as Promise<T> | undefined;
  if (!refresh) {
    refresh = callScript<T>(action)
      .then((data) => {
        contentCache.set(action, { at: Date.now(), data });
        return data;
      })
      .finally(() => contentRefresh.delete(action));
    contentRefresh.set(action, refresh);
  }
  return refresh;
}

/** Alumni directory rows. Cached for a few minutes. Callers must not mutate them. */
export async function fetchAlumni(): Promise<Alumnus[]> {
  return cachedScript<Alumnus[]>("alumni");
}

/** Brother-only links (Drive folders, calendar, docs). Cached for a few minutes. */
export async function fetchResources(): Promise<Resource[]> {
  return cachedScript<Resource[]>("resources");
}

/** Upcoming events from the chapter Google Calendar (next 60 days). Cached for a few minutes. */
export async function fetchEvents(): Promise<ChapterCalendar> {
  return cachedScript<ChapterCalendar>("events");
}

/** Brothers with emails and phone numbers, for the portal only. Cached for a few minutes. */
export async function fetchBrothers(): Promise<Brother[]> {
  return cachedScript<Brother[]>("brothers");
}

/**
 * The PUBLIC roster: the Apps Script strips emails and phone numbers and
 * leaves out anyone marked "No" under Show on website. Safe for public pages;
 * cache it with "use cache" there (src/lib/public-roster.ts).
 */
export async function fetchPublicRoster(): Promise<Brother[]> {
  return callScript<Brother[]>("roster");
}
