"use server";

import { signIn, signOut } from "@/auth";
import { getViewer } from "@/lib/dal";
import { fetchAlumni, requestAccess, saveMyProfile, sendExcusal } from "@/lib/portal-data";
import type { Alumnus } from "@/lib/portal-types";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/portal" });
}

export async function signOutOfPortal() {
  await signOut({ redirectTo: "/portal" });
}

/* ---------------- Coffee-chat email drafts ---------------- */

export type DraftResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

// Simple per-member limit so the API key can't be run up. It's per server
// instance, so the true ceiling is 20 × running instances; fine at chapter
// scale. Set a monthly spend limit on the key in the Anthropic Console too.
const DRAFTS_PER_HOUR = 20;
const recentDrafts = new Map<string, number[]>();

function underLimit(email: string) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (recentDrafts.get(email) ?? []).filter((t) => t > hourAgo);
  if (recent.length >= DRAFTS_PER_HOUR) return false;
  recent.push(Date.now());
  recentDrafts.set(email, recent);
  return true;
}

export type SenderDetails = { gradYear?: string; major?: string };

export async function draftCoffeeChat(
  alumnusId: string,
  note: string,
  sender: SenderDetails = {},
): Promise<DraftResult> {
  // Server actions are public endpoints, so check membership here too.
  const viewer = await getViewer();
  if (viewer.status !== "member") return { ok: false, error: "Please sign in again." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "Email drafting isn't set up yet." };

  if (typeof alumnusId !== "string" || alumnusId.length > 20) {
    return { ok: false, error: "Unknown alum." };
  }
  const extra = typeof note === "string" ? note.trim().slice(0, 400) : "";
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 60) : "");
  const senderGrad = clean(sender?.gradYear);
  const senderMajor = clean(sender?.major);

  if (!underLimit(viewer.email)) {
    return { ok: false, error: `You've drafted ${DRAFTS_PER_HOUR} emails this hour. Try again later.` };
  }

  // Look the alum up on the server rather than trusting details sent from the browser.
  // Errors stay inside the dialog instead of replacing the whole directory page.
  let alum: Alumnus | undefined;
  try {
    alum = (await fetchAlumni()).find((a) => a.id === alumnusId);
  } catch (error) {
    console.error("Alumni lookup failed during draft", error);
    return { ok: false, error: "The directory couldn't be reached. Try again in a minute." };
  }
  if (!alum) return { ok: false, error: "Couldn't find that alum. Refresh and try again." };

  const about = [
    `Name: ${alum.name}`,
    alum.position && `Role: ${alum.position}`,
    alum.company && `Company: ${alum.company}`,
    alum.location && `Location: ${alum.location}`,
    alum.major && `Major at Purdue: ${alum.major}`,
    alum.gradYear && `Graduated: ${alum.gradYear}`,
    alum.sector && `Sector: ${alum.sector}`,
  ]
    .filter(Boolean)
    .join("\n");

  const senderLine = [
    `${viewer.name}, a current brother`,
    senderGrad && `graduating ${senderGrad}`,
    senderMajor && `majoring in ${senderMajor}`,
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `Write a short, warm coffee-chat request email from a current Purdue student in Alpha Kappa Psi (Pi Omega chapter) to an alumnus of the chapter.

Sender: ${senderLine}.
${extra ? `What the sender wants to talk about: ${extra}\n` : ""}
Alumnus:
${about}

Guidelines: under 150 words; mention the shared AKPsi Pi Omega connection; reference their role or company specifically; ask for a 15–20 minute call and offer flexibility; no flattery, no buzzwords, no placeholders in square brackets. Sign off with the sender's name.

Reply in exactly this format and nothing else:
Subject: <subject line>

<email body>`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error("Anthropic API error", res.status, await res.text());
      return { ok: false, error: "The email generator is unavailable right now." };
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim() ?? "";
    const match = text.match(/^Subject:\s*(.+)\n+([\s\S]+)$/);
    if (!match) return { ok: true, subject: `Coffee chat? (AKPsi Pi Omega)`, body: text };
    return { ok: true, subject: match[1].trim(), body: match[2].trim() };
  } catch (error) {
    console.error("Coffee chat draft failed", error);
    return { ok: false, error: "The email generator is unavailable right now." };
  }
}

/* ---------------- Access requests ---------------- */

export type AccessRequestState = {
  status: "idle" | "pending" | "no-match" | "blocked" | "full" | "limit" | "error";
  /** The name they typed, to refill the field after a miss. */
  name?: string;
};

const REQUESTS_PER_HOUR = 5;
const recentRequests = new Map<string, number[]>();

/**
 * For someone signed in with a Google account that isn't on the Members tab:
 * if the full name they type matches the chapter roster, their email is added
 * to Members as Pending for an officer to approve. It never grants access.
 */
export async function requestPortalAccess(
  _previous: AccessRequestState,
  formData: FormData,
): Promise<AccessRequestState> {
  // Server actions are public endpoints: re-check who's asking.
  const viewer = await getViewer();
  if (viewer.status !== "not-member") return { status: "error" };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (name.split(" ").length < 2) return { status: "no-match", name };

  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (recentRequests.get(viewer.email) ?? []).filter((t) => t > hourAgo);
  if (recent.length >= REQUESTS_PER_HOUR) return { status: "limit", name };
  recentRequests.set(viewer.email, [...recent, Date.now()]);

  try {
    const result = await requestAccess(viewer.email, name, viewer.name);
    return { status: result, name };
  } catch (error) {
    console.error("Access request failed", error);
    return { status: "error", name };
  }
}

/* ---------------- My profile ---------------- */

export type ProfileState = { status: "idle" | "saved" | "error"; message?: string };

const PROFILE_FIELDS = ["pledgeClass", "gradYear", "major", "linkedin", "personalEmail", "phone"] as const;

export async function saveProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (viewer.status !== "member") return { status: "error", message: "Please sign in again." };

  const updates: Record<string, string | boolean> = {};
  for (const field of PROFILE_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") updates[field] = value.slice(0, 200);
  }
  updates.show = formData.get("show") === "on";

  try {
    const result = await saveMyProfile(viewer.email, viewer.name, updates);
    if (!result.found) return { status: "error", message: "We couldn't find you on the roster." };
    if (result.error) return { status: "error", message: result.error };
    return { status: "saved" };
  } catch (error) {
    console.error("Profile save failed", error);
    return { status: "error", message: "Couldn't save right now. Try again in a minute." };
  }
}

/* ---------------- Excusal requests ---------------- */

export type ExcusalState = { status: "idle" | "sent" | "error"; message?: string };

const EXCUSALS_PER_DAY = 10;
const MAX_PROOF_BYTES = 2 * 1024 * 1024;
const recentExcusals = new Map<string, number[]>();

/** Magic numbers, so only real images are forwarded. */
function imageType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function submitExcusal(_previous: ExcusalState, formData: FormData): Promise<ExcusalState> {
  const viewer = await getViewer();
  if (viewer.status !== "member") return { status: "error", message: "Please sign in again." };

  const text = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
  const event = text("event", 150) === "__other" ? text("otherEvent", 150) : text("event", 150);
  const eventDate = text("eventDate", 40);
  const reason = text("reason", 2000);
  if (!event) return { status: "error", message: "Choose the event you'll miss." };
  if (reason.length < 5) return { status: "error", message: "Add a short reason." };

  let proof: { type: string; data: string } | null = null;
  const file = formData.get("proof");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PROOF_BYTES) return { status: "error", message: "That photo is too large. Try a smaller one." };
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type) return { status: "error", message: "Proof has to be a photo or screenshot (JPG or PNG)." };
    proof = { type, data: bytes.toString("base64") };
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = (recentExcusals.get(viewer.email) ?? []).filter((t) => t > dayAgo);
  if (recent.length >= EXCUSALS_PER_DAY) return { status: "error", message: "That's a lot of requests today. Contact the secretary directly." };
  recentExcusals.set(viewer.email, [...recent, Date.now()]);

  try {
    await sendExcusal({ email: viewer.email, name: viewer.name, event, eventDate, reason, proof });
    return { status: "sent" };
  } catch (error) {
    console.error("Excusal failed", error);
    return { status: "error", message: "Couldn't send it right now. Try again, or email the secretary directly." };
  }
}
