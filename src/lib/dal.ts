import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  fetchAlumni,
  fetchBrothers,
  fetchEvents,
  fetchMyPoints,
  fetchMyProfile,
  fetchResources,
  type ProfileResult,
} from "@/lib/portal-data";
import type { Alumnus, Brother, ChapterCalendar, MyPoints, Resource } from "@/lib/portal-types";

/*
  Data access layer for the member portal. Every read of brother-only data
  goes through here, and every function checks membership. Being signed in
  is not enough: the email must be on the Members tab. That answer lives in
  the signed session and is re-checked every 5 minutes (src/auth.ts), so
  removing someone takes effect within 5 minutes, even mid-session.
*/

export type Viewer =
  | { status: "signed-out" }
  | { status: "not-member"; email: string; name: string }
  | { status: "member"; email: string; name: string };

/** Who is looking at the page. Memoized for the length of one request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return { status: "signed-out" };

  const member = session?.member;
  if (!member) return { status: "not-member", email, name: session?.user?.name ?? "" };

  return {
    status: "member",
    email,
    name: member.name || session?.user?.name || email,
  };
});

/** For pages: sends anyone who isn't a current member back to /portal. */
export async function requireMember() {
  const viewer = await getViewer();
  if (viewer.status !== "member") redirect("/portal");
  return viewer;
}

export async function getAlumniForMember(): Promise<Alumnus[]> {
  // Start loading the directory while membership is checked, but only hand
  // it over once the check passes. The catch stops an unhandled rejection if
  // the check redirects first.
  const pending = fetchAlumni();
  pending.catch(() => {});
  await requireMember();
  const alumni = await pending;
  // Copy before sorting: the array is shared with the cache.
  return [...alumni].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Brother resources, or null if they couldn't be loaded. A broken or missing
 * Resources tab only hides that section; it doesn't take down the portal.
 */
export async function getResourcesForMember(): Promise<Resource[] | null> {
  await requireMember();
  try {
    return await fetchResources();
  } catch (error) {
    console.error("Couldn't load portal resources", error);
    return null;
  }
}

/**
 * Upcoming chapter events, or null if the calendar couldn't be loaded. Like
 * resources, a calendar problem only hides that section.
 */
export async function getEventsForMember(): Promise<ChapterCalendar | null> {
  await requireMember();
  try {
    return await fetchEvents();
  } catch (error) {
    console.error("Couldn't load chapter calendar", error);
    return null;
  }
}

/** Active brothers with contact info, for the portal's brother directory. */
export async function getBrothersForMember(): Promise<Brother[]> {
  const pending = fetchBrothers();
  pending.catch(() => {});
  await requireMember();
  return pending;
}

/** The signed-in brother's own Roster row, for the My profile page. */
export async function getMyProfile(): Promise<ProfileResult> {
  const viewer = await requireMember();
  return fetchMyProfile(viewer.email, viewer.name);
}

/** The signed-in brother's own points. Only ever their row. */
export async function getMyPoints(): Promise<MyPoints> {
  const viewer = await requireMember();
  return fetchMyPoints(viewer.email, viewer.name);
}

/**
 * Called from the portal home: quietly load what the other portal pages
 * need, so the next click doesn't wait on the sheet.
 * Only ever for the signed-in member's own data.
 */
export async function warmPortal() {
  const viewer = await getViewer();
  if (viewer.status !== "member") return;
  // Start now (in parallel with the rest of the page), and keep the server
  // alive until it's done with after().
  const loading = Promise.allSettled([
    fetchBrothers(),
    fetchAlumni(),
    fetchMyPoints(viewer.email, viewer.name),
    fetchMyProfile(viewer.email, viewer.name),
  ]);
  after(() => loading);
}
