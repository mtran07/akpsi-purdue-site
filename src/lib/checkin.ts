import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckinSession } from "@/lib/portal-types";

/*
  Chapter check-in codes and tickets.

  The QR on the secretary's screen links to /api/check-in?s=<session>&c=<code>.
  The code is an HMAC of the session and the current 30-second slot, so it
  changes every 30 seconds and can't be guessed. A scan is accepted for the
  current slot or the one before (so 30-60 seconds), which is what stops a
  screenshot texted to someone at home from working.

  A good scan earns a short "ticket" cookie, so a brother who still has to
  sign in with Google doesn't lose their place. The ticket only works for the
  same session, for 10 minutes, and only while check-in is open.
*/

export const CODE_SLOT_MS = 30_000;
const TICKET_MS = 10 * 60_000;
export const TICKET_COOKIE = "akpsi_checkin";

function key(purpose: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return createHmac("sha256", secret).update(`akpsi-checkin:${purpose}`).digest();
}

function sign(purpose: string, value: string) {
  return createHmac("sha256", key(purpose)).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function slotAt(session: CheckinSession, now: number) {
  return Math.floor((now - session.openedAt) / CODE_SLOT_MS);
}

export function codeFor(session: CheckinSession, slot: number) {
  return sign("code", `${session.id}:${slot}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
}

export function isOpen(session: CheckinSession | null, now = Date.now()): session is CheckinSession {
  return !!session && !session.closed && now < session.closesAt;
}

/** True for the code on screen now or the one just before it. */
export function codeIsCurrent(session: CheckinSession, code: string, now = Date.now()) {
  const slot = slotAt(session, now);
  return [slot, slot - 1].some((s) => s >= 0 && safeEqual(codeFor(session, s), code));
}

export function makeTicket(sessionId: string, now = Date.now()) {
  const body = `${sessionId}.${now}`;
  return `${body}.${sign("ticket", body)}`;
}

export function ticketIsValid(ticket: string | undefined, session: CheckinSession, now = Date.now()) {
  if (!ticket) return false;
  const [sessionId, issued, mac] = ticket.split(".");
  if (!sessionId || !issued || !mac) return false;
  if (!safeEqual(sign("ticket", `${sessionId}.${issued}`), mac)) return false;
  const age = now - Number(issued);
  return sessionId === session.id && age >= 0 && age < TICKET_MS;
}

/** Meters between two points (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
