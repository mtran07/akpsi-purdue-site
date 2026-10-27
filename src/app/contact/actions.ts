"use server";

import { headers } from "next/headers";
import { CONTACT_TOPICS } from "@/lib/contact-topics";
import { sendContactMessage } from "@/lib/portal-data";

export type ContactState = { status: "idle" | "sent" | "error"; message?: string };

// Per-visitor limit (per server instance). The Apps Script also caps the day.
const PER_HOUR = 3;
const recent = new Map<string, number[]>();
const MIN_FILL_MS = 3_000; // humans take longer than this to fill the form

export async function sendContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const text = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

  // Spam traps: a hidden field people never see, and a form filled in too fast.
  // Pretend success so bots don't learn anything.
  if (text("website", 200)) return { status: "sent" };
  const startedAt = Number(text("startedAt", 20));
  if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return { status: "sent" };

  const name = text("name", 100);
  const email = text("email", 200);
  const topic = text("topic", 60);
  const message = text("message", 4000);
  if (!name) return { status: "error", message: "Add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Add an email we can reply to." };
  if (message.length < 10) return { status: "error", message: "Add a little more detail to your message." };
  if ((message.match(/https?:\/\//g) ?? []).length > 3) return { status: "error", message: "Please include fewer links." };

  const h = await headers();
  const visitor = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const times = (recent.get(visitor) ?? []).filter((t) => t > hourAgo);
  if (times.length >= PER_HOUR) return { status: "error", message: "You've sent a few messages already. Try again later." };
  recent.set(visitor, [...times, Date.now()]);

  try {
    await sendContactMessage({
      name,
      email,
      topic: (CONTACT_TOPICS as readonly string[]).includes(topic) ? topic : "Other",
      message,
    });
    return { status: "sent" };
  } catch (error) {
    console.error("Contact form failed", error);
    return { status: "error", message: "Something went wrong sending your message. Try again in a minute." };
  }
}
