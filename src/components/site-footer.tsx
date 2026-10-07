import Link from "next/link";
import site from "@/data/site.json";

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-white">
            {site.chapterName} <span className="text-gold">{site.chapterShort}</span>
          </p>
          <p className="mt-1 text-sm">
            {site.chapter} · {site.school}
          </p>
          <p className="mt-3 text-sm">{site.address}</p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-sm">
          <p className="font-medium text-white">Follow us</p>
          <ul className="mt-2 space-y-1">
            <li>
              <a href={site.social.instagram} className="hover:text-gold" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={site.social.linkedin} className="hover:text-gold" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {site.chapterName} | {site.chapter}
      </p>
    </footer>
  );
}
