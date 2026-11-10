"use server";

import { CODE_SLOT_MS, codeFor, isOpen, slotAt } from "@/lib/checkin";
import { getOfficer, getViewer } from "@/lib/dal";
import {
  addCheckinByHand,
  applyCheckinSession,
  closeCheckinSession,
  fetchCheckinState,
  fetchPointsColumns,
  removeCheckin,
  startCheckinSession,
} from "@/lib/portal-data";
import type { Checkin, CheckinApplyResult, CheckinSession } from "@/lib/portal-types";

/*
  The secretary's check-in screen. Server actions are public endpoints, so
  every one checks that the caller is on the Officers tab (and the Apps
  Script checks again for anything that writes).
*/

async function officerEmail() {
  const viewer = await getViewer();
  const officer = await getOfficer();
  if (viewer.status !== "member" || !officer) throw new Error("Officers only.");
  return viewer.email;
}

export type LiveCheckin = {
  session: Omit<CheckinSession, "geo"> & { usesLocation: boolean } | null;
  checkins: Checkin[];
  open: boolean;
  /** Codes for the current and next 30-second slots, so the screen switches on time between polls. */
  codes: { code: string; from: number; until: number }[];
  serverNow: number;
};

function present(state: { session: CheckinSession | null; checkins: Checkin[] }): LiveCheckin {
  const now = Date.now();
  const s = state.session;
  const open = isOpen(s, now);
  const codes = [];
  if (s && open) {
    const slot = slotAt(s, now);
    for (const n of [slot, slot + 1]) {
      codes.push({ code: codeFor(s, n), from: s.openedAt + n * CODE_SLOT_MS, until: s.openedAt + (n + 1) * CODE_SLOT_MS });
    }
  }
  // The room's coordinates stay on the server.
  let session: LiveCheckin["session"] = null;
  if (s) {
    const { geo, ...rest } = s;
    session = { ...rest, usesLocation: !!geo };
  }
  return { session, checkins: state.checkins, open, codes, serverNow: now };
}

export async function getLiveCheckin(): Promise<LiveCheckin> {
  await officerEmail();
  return present(await fetchCheckinState());
}

export async function startCheckin(input: {
  event: string;
  minutes: number;
  geo: { lat: number; lng: number } | null;
}): Promise<LiveCheckin> {
  const email = await officerEmail();
  const event = String(input.event ?? "").trim().slice(0, 80) || "Chapter";
  const minutes = Math.max(5, Math.min(120, Math.round(Number(input.minutes) || 15)));
  const geo =
    input.geo && Number.isFinite(input.geo.lat) && Number.isFinite(input.geo.lng)
      ? { lat: input.geo.lat, lng: input.geo.lng, radius: 300 }
      : null;
  return present(await startCheckinSession(email, { event, minutes, geo }));
}

export async function closeCheckin(): Promise<LiveCheckin> {
  const email = await officerEmail();
  return present(await closeCheckinSession(email));
}

export async function addByHand(sessionId: string, name: string, email: string): Promise<LiveCheckin> {
  const officer = await officerEmail();
  await addCheckinByHand(sessionId, officer, String(email ?? "").slice(0, 200), String(name ?? "").slice(0, 100));
  return present(await fetchCheckinState());
}

export async function removeFromCheckin(sessionId: string, email: string, name: string): Promise<LiveCheckin> {
  const officer = await officerEmail();
  return present(await removeCheckin(sessionId, officer, String(email ?? ""), String(name ?? "")));
}

export async function getPointsColumns() {
  const email = await officerEmail();
  return (await fetchPointsColumns(email)).columns;
}

export async function applyToPoints(
  sessionId: string,
  col: number,
  markRest: boolean,
): Promise<{ ok: true; result: CheckinApplyResult } | { ok: false; error: string }> {
  const email = await officerEmail();
  try {
    return { ok: true, result: await applyCheckinSession(email, sessionId, Number(col), !!markRest) };
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^Portal data source error: /, "") : "Couldn't apply.";
    return { ok: false, error: message };
  }
}
