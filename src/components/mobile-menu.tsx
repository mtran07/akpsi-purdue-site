"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileAccountLink } from "@/components/account-button";

/*
  Phone menu. Closes when you pick a page, tap outside it, press Escape, or
  rotate to a wider screen, and the page behind it doesn't scroll while open.
*/
export function MobileMenu({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  // Navigating anywhere (including the back button) closes it.
  if (open && openedOn !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          setOpenedOn(pathname);
          setOpen((o) => !o);
        }}
        className="-mr-2 flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium"
      >
        <span aria-hidden className="relative block h-3.5 w-5">
          <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
        </span>
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <>
          {/* Tap anywhere outside the menu to close it. */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-navy-deep/60 backdrop-blur-[2px]"
          />
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-navy-deep px-4 pb-4 pt-2 shadow-2xl"
          >
            {items.map((item) => {
              const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`block rounded-lg px-3 py-3 text-base ${current ? "bg-white/10 font-semibold text-gold" : "text-white hover:bg-white/10"}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div onClick={() => setOpen(false)}>
              <MobileAccountLink />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
