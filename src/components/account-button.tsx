"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/*
  The top-right "Sign In" / "Portal" button. Pages stay static, so the
  browser asks Auth.js who's signed in (/api/auth/session) and re-asks after
  each navigation, which catches signing in and out.
*/

type Who = { state: "loading" } | { state: "out" } | { state: "in"; name: string };

function useWho(): Who {
  const pathname = usePathname();
  const [who, setWho] = useState<Who>({ state: "loading" });
  useEffect(() => {
    let live = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: { name?: string | null; email?: string | null }; member?: { name?: string } | null } | null) => {
        if (!live) return;
        if (s?.user) setWho({ state: "in", name: s.member?.name || s.user.name || s.user.email || "" });
        else setWho({ state: "out" });
      })
      .catch(() => live && setWho({ state: "out" }));
    return () => {
      live = false;
    };
  }, [pathname]);
  return who;
}

export function AccountButton() {
  const who = useWho();
  if (who.state === "in") {
    const first = who.name.split(" ")[0];
    return (
      <Link
        href="/portal"
        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gold py-1 pl-1 pr-4 text-sm font-semibold text-navy transition hover:brightness-110"
      >
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-bold text-gold">
          {first.charAt(0).toUpperCase() || "•"}
        </span>
        Portal
        <span className="sr-only">, signed in as {who.name}</span>
      </Link>
    );
  }
  return (
    <Link
      href="/sign-in"
      aria-busy={who.state === "loading"}
      className={`whitespace-nowrap rounded-full border border-gold px-4 py-1.5 text-sm font-medium text-gold transition hover:bg-gold hover:text-navy ${
        who.state === "loading" ? "invisible" : ""
      }`}
    >
      Sign In
    </Link>
  );
}

export function MobileAccountLink() {
  const who = useWho();
  return (
    <Link
      href={who.state === "in" ? "/portal" : "/sign-in"}
      className="mt-2 block border-t border-white/10 px-3 pb-3 pt-4 text-base font-semibold text-gold hover:text-white"
    >
      {who.state === "in" ? `Member Portal · ${who.name.split(" ")[0]}` : "Sign In"}
    </Link>
  );
}
