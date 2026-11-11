import Link from "next/link";
import site from "@/data/site.json";
import { AccountButton, MobileAccountLink } from "@/components/account-button";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="AKPsi Purdue home" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-gold">{site.chapterShort}</span>
          {/* Hidden at tablet width only, where the full menu needs the room. */}
          <span className="whitespace-nowrap text-sm font-medium tracking-wide md:hidden lg:inline">Purdue · Pi Omega</span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-4 md:flex lg:gap-6">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm text-white/85 transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
          <AccountButton />
        </nav>

        {/* Mobile navigation: <details> keeps it working without client JavaScript */}
        <details className="group relative md:hidden">
          <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <nav
            aria-label="Main"
            className="absolute right-0 mt-2 w-56 rounded-lg bg-navy-deep p-2 shadow-xl ring-1 ring-white/10"
          >
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2.5 text-sm hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <MobileAccountLink />
          </nav>
        </details>
      </div>
    </header>
  );
}
