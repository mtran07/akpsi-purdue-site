import Image from "next/image";
import Link from "next/link";
import site from "@/data/site.json";
import { AccountButton } from "@/components/account-button";
import { MobileMenu } from "@/components/mobile-menu";
import crest from "../../public/images/crest.png";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="AKPsi Purdue home" className="flex items-center gap-3">
          <Image src={crest} alt="" width={44} height={44} priority className="h-11 w-11 shrink-0" />
          {/* Hidden at tablet width only, where the full menu needs the room. */}
          <span className="leading-tight md:hidden lg:block">
            <span className="block whitespace-nowrap font-display text-base font-bold tracking-wide">{site.chapterName.toUpperCase()}</span>
            <span className="block whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">
              Pi Omega · Purdue
            </span>
          </span>
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
