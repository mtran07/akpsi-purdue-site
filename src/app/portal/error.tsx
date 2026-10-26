"use client";

// Shown if the portal's Google Sheet can't be reached (Apps Script down,
// wrong key, renamed tab). Details go to the Vercel logs, not the screen.
export default function PortalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-navy">The portal can&apos;t load right now</h1>
      <p className="mt-4 text-muted">
        Try again in a minute. If it keeps happening, let the Technology Committee know.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
      >
        Try again
      </button>
    </section>
  );
}
