"use client";

import { createContext, useContext, useState } from "react";

/*
  Names on officer screens start blurred so the dashboard can be shown on a
  projector or in a demo. "Show names" reveals them until the page is left.
  This is a screen-sharing guard, not access control: only officers can open
  these pages in the first place.
*/

const HiddenContext = createContext(true);
const ToggleContext = createContext<() => void>(() => {});

export function PrivateNamesProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true);
  return (
    <HiddenContext.Provider value={hidden}>
      <ToggleContext.Provider value={() => setHidden((h) => !h)}>{children}</ToggleContext.Provider>
    </HiddenContext.Provider>
  );
}

export function Private({ children }: { children: React.ReactNode }) {
  const hidden = useContext(HiddenContext);
  if (!hidden) return <>{children}</>;
  return (
    <span className="pointer-events-none select-none blur-[6px]" aria-label="Hidden">
      <span aria-hidden>{children}</span>
    </span>
  );
}

export function NamesToggle() {
  const hidden = useContext(HiddenContext);
  const toggle = useContext(ToggleContext);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!hidden}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
        hidden ? "bg-white text-navy ring-line hover:ring-navy" : "bg-amber-50 text-amber-900 ring-amber-600/30"
      }`}
    >
      <span aria-hidden>{hidden ? "🙈" : "👀"}</span>
      {hidden ? "Names Hidden · Show Names" : "Names Showing · Hide Names"}
    </button>
  );
}
