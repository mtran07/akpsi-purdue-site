"use server";

import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { distanceMeters, isOpen, ticketIsValid, TICKET_COOKIE } from "@/lib/checkin";
import { getViewer } from "@/lib/dal";
import { addCheckin, fetchCheckinState } from "@/lib/portal-data";

export async function signInForCheckIn() {
  // Back to the check-in page after Google; the scan ticket cookie survives the trip.
  await signIn("google", { redirectTo: "/portal/check-in" });
}

export type CheckInResult = {
  status: "idle" | "checked-in" | "already" | "error";
  message?: string;
  at?: number;
};

const recent = new Map<string, number[]>();

/**
 * A brother checks themselves in. Requires: a current member, a valid ticket
 * from scanning this session's code, check-in still open, and (if the
 * secretary turned it on) a location near the room.
 */
export async function checkInMe(_previous: CheckInResult, formData: FormData): Promise<CheckInResult> {
  const viewer = await getViewer();
  if (viewer.status !== "member") return { status: "error", message: "Sign in to the brother portal first." };

  const minuteAgo = Date.now() - 60_000;
  const tries = (recent.get(viewer.email) ?? []).filter((t) => t > minuteAgo);
  if (tries.length >= 6) return { status: "error", message: "Too many tries. Wait a minute." };
  recent.set(viewer.email, [...tries, Date.now()]);

  let state;
  try {
    state = await fetchCheckinState();
  } catch (error) {
    console.error("Check-in: couldn't load the session", error);
    return { status: "error", message: "Check-in isn't reachable right now. Try again, or ask the secretary to add you." };
  }
  const session = state.session;
  if (!isOpen(session)) return { status: "error", message: "Check-in is closed. Ask the secretary to add you." };

  const jar = await cookies();
  if (!ticketIsValid(jar.get(TICKET_COOKIE)?.value, session)) {
    return { status: "error", message: "Scan the code on the screen in the room first." };
  }

  if (session.geo) {
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    const accuracy = Math.min(Number(formData.get("accuracy")) || 0, 500);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || formData.get("lat") === null) {
      return { status: "error", message: "This check-in needs your location. Allow location for this site and try again." };
    }
    const meters = distanceMeters(session.geo, { lat, lng });
    // Phones indoors can be off by a block, so allow for the reported accuracy.
    if (meters - accuracy > session.geo.radius) {
      return { status: "error", message: "You need to be at chapter to check in. Nothing was recorded." };
    }
  }

  try {
    const result = await addCheckin(session.id, viewer.email, viewer.name);
    if (result.result === "checked-in") {
      jar.delete(TICKET_COOKIE);
      return { status: "checked-in", at: result.at };
    }
    if (result.result === "already") return { status: "already", at: result.at };
    return { status: "error", message: "Check-in is closed. Ask the secretary to add you." };
  } catch (error) {
    console.error("Check-in failed", error);
    return { status: "error", message: "That didn't go through. Try again, or ask the secretary to add you." };
  }
}
