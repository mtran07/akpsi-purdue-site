"use client";

import { startTransition, useActionState, useState } from "react";
import { submitExcusal, type ExcusalState } from "@/app/portal/actions";

export type EventOption = { title: string; date: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink focus:border-navy focus:outline-none";
const MAX_SIDE = 1600;

/**
 * Phone photos are often 3–8 MB. Redraw them at most 1600px on the long side
 * as JPEG (~200–400 KB) before upload. Returns null if the browser can't read
 * the file (e.g. some HEIC photos), so the form can ask for another.
 */
async function shrinkImage(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // transparent screenshots get a white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch {
    return null;
  }
}

export function ExcusalForm({ events, email }: { events: EventOption[]; email: string }) {
  const [state, formAction, isPending] = useActionState<ExcusalState, FormData>(submitExcusal, { status: "idle" });
  const [choice, setChoice] = useState("");
  const [proof, setProof] = useState<{ blob: Blob; url: string } | null>(null);
  const [proofError, setProofError] = useState("");
  const [preparing, setPreparing] = useState(false);

  async function onPickFile(file: File | undefined) {
    setProofError("");
    if (proof) URL.revokeObjectURL(proof.url);
    setProof(null);
    if (!file) return;
    setPreparing(true);
    const blob = await shrinkImage(file);
    setPreparing(false);
    if (!blob) {
      setProofError("That file couldn't be read. Try a screenshot or a JPG/PNG photo.");
      return;
    }
    setProof({ blob, url: URL.createObjectURL(blob) });
  }

  if (state.status === "sent") {
    return (
      <div role="status" className="max-w-2xl rounded-xl bg-gold-soft p-6 text-navy">
        <p className="font-display text-xl font-bold">Sent to the secretary</p>
        <p className="mt-2 text-sm">
          A copy went to <span className="font-medium">{email}</span>. The secretary will reply to that email.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm font-semibold underline underline-offset-4"
        >
          Send another
        </button>
      </div>
    );
  }

  const picked = events.find((e) => `${e.title}|${e.date}` === choice);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (picked) {
          data.set("event", picked.title);
          data.set("eventDate", picked.date);
        }
        data.delete("proofFile");
        if (proof) data.set("proof", proof.blob, "proof.jpg");
        startTransition(() => formAction(data));
      }}
      className="max-w-2xl space-y-6 rounded-xl border border-line bg-white p-6 sm:p-8"
    >
      <label className="block">
        <span className="text-sm font-medium text-ink">Event you&apos;ll miss</span>
        <select name="event" required value={choice} onChange={(e) => setChoice(e.target.value)} className={inputClass}>
          <option value="" disabled>
            Choose an event
          </option>
          {events.map((e) => (
            <option key={`${e.title}|${e.date}`} value={`${e.title}|${e.date}`}>
              {e.title} · {e.date}
            </option>
          ))}
          <option value="__other">Another event (type it in)</option>
        </select>
      </label>

      {choice === "__other" && (
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-ink">Event name</span>
            <input name="otherEvent" required maxLength={150} className={inputClass} placeholder="e.g. Chapter meeting" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Date</span>
            <input name="eventDate" type="date" className={inputClass} />
          </label>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium text-ink">Reason</span>
        <textarea
          name="reason"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          className={inputClass}
          placeholder="e.g. Exam for ECE 20001 at the same time"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-ink">Proof (optional)</span>
        <p className="text-xs text-muted">A screenshot or photo: exam schedule, doctor&apos;s note, flight confirmation…</p>
        <label className="mt-2 flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-line p-4 hover:border-navy">
          {proof ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the user's own file
            <img src={proof.url} alt="Your proof" className="h-20 w-20 rounded-md object-cover" />
          ) : (
            <span aria-hidden className="flex h-20 w-20 items-center justify-center rounded-md bg-paper-alt text-2xl text-muted">
              +
            </span>
          )}
          <span className="text-sm text-navy">
            {preparing ? "Preparing photo…" : proof ? "Change photo" : "Add a photo"}
          </span>
          <input
            name="proofFile"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </label>
        {proof && (
          <button type="button" onClick={() => onPickFile(undefined)} className="mt-2 text-xs text-muted underline">
            Remove photo
          </button>
        )}
        {proofError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {proofError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isPending || preparing}
          className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send to secretary"}
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
