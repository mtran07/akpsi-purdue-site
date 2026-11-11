"use client";

import { useState, useTransition } from "react";
import { decideAccess, type DecideResult } from "@/app/portal/exec/actions";

export function AccessRequestActions({ email, name }: { email: string; name: string }) {
  const [result, setResult] = useState<DecideResult | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approve" | "decline") =>
    startTransition(async () => {
      setConfirmDecline(false);
      setResult(await decideAccess(email, decision));
    });

  if (result?.ok) {
    return (
      <p role="status" className="mt-2 text-sm font-medium text-green-800">
        {result.message}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("approve")}
          aria-label={`Approve ${name || email}`}
          className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Approve"}
        </button>
        {confirmDecline ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("decline")}
              className="rounded-full bg-red-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Yes, decline
            </button>
            <button type="button" onClick={() => setConfirmDecline(false)} className="text-xs text-muted underline">
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDecline(true)}
            aria-label={`Decline ${name || email}`}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted ring-1 ring-inset ring-line hover:text-red-700 disabled:opacity-60"
          >
            Decline
          </button>
        )}
      </div>
      {result && !result.ok && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {result.message}
        </p>
      )}
    </div>
  );
}
