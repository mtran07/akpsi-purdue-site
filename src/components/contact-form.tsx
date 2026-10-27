"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { sendContact, type ContactState } from "@/app/contact/actions";
import { CONTACT_TOPICS } from "@/lib/contact-topics";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink focus:border-navy focus:outline-none";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  // When the page finished loading: messages sent within seconds of it are from bots.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl bg-gold-soft p-8 text-navy">
        <p className="font-display text-2xl font-bold">Thanks for reaching out!</p>
        <p className="mt-2">We&apos;ll get back to you at the email you gave us, usually within a few days.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("startedAt", String(startedAt.current));
        startTransition(() => formAction(data));
      }}
      className="space-y-5 rounded-xl border border-line bg-white p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Name</span>
          <input name="name" required maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink">What&apos;s this about?</span>
        <select name="topic" defaultValue={CONTACT_TOPICS[0]} className={inputClass}>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">Message</span>
        <textarea name="message" required minLength={10} maxLength={4000} rows={6} className={inputClass} />
      </label>

      {/* Spam trap: hidden from people, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send message"}
        </button>
        {state.status === "error" && !isPending && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
