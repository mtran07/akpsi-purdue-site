"use client";

import { startTransition, useActionState, useState } from "react";
import { checkInMe, type CheckInResult } from "@/app/portal/check-in/actions";

const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis", hour: "numeric", minute: "2-digit" });

/** "Check me in", asking for the phone's location first if this session needs it. */
export function CheckInButton({ needsLocation, event }: { needsLocation: boolean; event: string }) {
  const [state, action, isPending] = useActionState<CheckInResult, FormData>(checkInMe, { status: "idle" });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  function submit() {
    setLocError("");
    const data = new FormData();
    if (!needsLocation) {
      startTransition(() => action(data));
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocError("This phone can't share its location. Ask the secretary to add you.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        data.set("lat", String(pos.coords.latitude));
        data.set("lng", String(pos.coords.longitude));
        data.set("accuracy", String(pos.coords.accuracy));
        startTransition(() => action(data));
      },
      () => {
        setLocating(false);
        setLocError("Location is blocked for this site. Allow it in your browser settings, or ask the secretary to add you.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  if (state.status === "checked-in" || state.status === "already") {
    return (
      <div role="status" className="rounded-2xl bg-green-50 p-6 text-center text-green-900 ring-1 ring-green-600/20">
        <p aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white">
          ✓
        </p>
        <p className="mt-3 font-display text-2xl font-bold">
          {state.status === "already" ? "Already checked in" : "You're checked in"}
        </p>
        <p className="mt-1">
          {event}
          {state.at ? ` · ${timeFormat.format(new Date(state.at))}` : ""}
        </p>
        <p className="mt-3 text-sm">It shows on My points once the secretary applies today&apos;s check-ins.</p>
      </div>
    );
  }

  const busy = isPending || locating;
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-full bg-navy px-6 py-4 text-lg font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
      >
        {locating ? "Checking your location…" : isPending ? "Checking you in…" : "Check me in"}
      </button>
      {needsLocation && !busy && (
        <p className="text-center text-sm text-muted">Your phone will ask to share your location once, to confirm you&apos;re at chapter.</p>
      )}
      {(locError || state.status === "error") && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {locError || state.message}
        </p>
      )}
    </div>
  );
}
