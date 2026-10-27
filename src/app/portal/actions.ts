"use server";

import { signIn, signOut } from "@/auth";
import { getViewer } from "@/lib/dal";
import { fetchAlumni } from "@/lib/portal-data";
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
