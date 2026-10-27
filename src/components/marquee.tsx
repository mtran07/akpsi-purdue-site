"use client";

import { useState } from "react";

/**
 * A strip of items that scrolls sideways forever. Pauses on hover and with
 * its Pause button (moving content needs a way to stop it, WCAG 2.2.2);
 * with "reduce motion" on it doesn't move at all. Styles: globals.css.
 */
export function Marquee({ items, label, seconds = 40 }: { items: string[]; label: string; seconds?: number }) {
  const [paused, setPaused] = useState(false);

  const pills = (hidden: boolean) =>
    items.map((item) => (
      <li
        key={`${hidden ? "b" : "a"}-${item}`}
        aria-hidden={hidden || undefined}
        className="shrink-0 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium whitespace-nowrap text-ink"
      >
        {item}
      </li>
    ));

  return (
    <div className="marquee relative" data-paused={paused}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {/* Two copies side by side; the track slides left by one copy, then loops. */}
        <ul
          aria-label={label}
          className="marquee-track flex w-max gap-3 pr-3"
          style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}
        >
          {pills(false)}
          {pills(true)}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink motion-reduce:hidden"
      >
        {paused ? "▶ Play" : "❚❚ Pause"}
      </button>
    </div>
  );
}
