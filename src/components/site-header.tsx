import Link from "next/link";
import site from "@/data/site.json";
import { AccountButton } from "@/components/account-button";
import { MobileMenu } from "@/components/mobile-menu";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white"
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

        <MobileMenu items={site.nav} />
      </div>
    </header>
  );
}
