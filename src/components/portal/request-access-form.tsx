"use client";

import { useActionState } from "react";
import { requestPortalAccess, type AccessRequestState } from "@/app/portal/actions";

const MESSAGES: Record<Exclude<AccessRequestState["status"], "idle">, { tone: "info" | "error"; text: string }> = {
  pending: {
    tone: "info",
    text: "We found your name on the chapter roster and sent a request to the officers. Once it's approved, come back here and you'll be in.",
  },
  "no-match": {
    tone: "error",
    text: "We couldn't find that name on the chapter roster. Check the spelling and use your full first and last name, or contact the VP of Membership.",
  },
  blocked: {
    tone: "error",
    text: "This account doesn't have portal access. If that's a mistake, contact the VP of Membership.",
  },
  full: {
    tone: "error",
    text: "There are a lot of requests waiting right now. Please contact the VP of Membership.",
  },
  limit: {
    tone: "error",
    text: "That's a few tries in a row. Wait a bit, or contact the VP of Membership.",
  },
  error: {
    tone: "error",
    text: "Something went wrong sending your request. Try again in a minute.",
  },
};

export function RequestAccessForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState(requestPortalAccess, { status: "idle" });
  const message = state.status === "idle" ? null : MESSAGES[state.status];

  if (state.status === "pending") {
    return (
      <p role="status" className="mt-6 rounded-lg bg-gold-soft p-4 text-sm text-navy">
        {message?.text}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <label htmlFor="request-name" className="block text-sm font-medium text-ink">
        Full name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="request-name"
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          defaultValue={state.name ?? defaultName}
          placeholder="First and last name"
          className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-ink focus:border-navy focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {isPending ? "Checking…" : "Request access"}
        </button>
      </div>
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {message.text}
        </p>
      )}
    </form>
  );
}
