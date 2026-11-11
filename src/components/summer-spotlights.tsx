import Image from "next/image";
import spotlights from "@/data/spotlights.json";
import { Section } from "@/components/page-header";

/** Summer internship spotlights (src/data/spotlights.json), from the Instagram series. */
export function SummerSpotlights() {
  if (!spotlights.show || spotlights.spotlights.length === 0) return null;
  return (
    <Section id="spotlights" title={spotlights.title}>
      <p className="reveal -mt-4 max-w-2xl text-muted">{spotlights.intro}</p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {spotlights.spotlights.map((s) => (
          <li key={s.name} className="reveal flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
            <div className="relative aspect-square bg-paper-alt">
              <Image
                src={s.photo}
                alt={`${s.name} during their internship at ${s.company}`}
                fill
                sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-navy-deep/90 px-3 py-1 text-sm font-semibold text-white">
                @{s.company}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="font-display text-xl font-bold text-navy">{s.name}</p>
              <p className="text-sm font-medium text-gold">{s.detail}</p>
              <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-ink/80">&ldquo;{s.quote}&rdquo;</blockquote>
            </div>
          </li>
        ))}
      </ul>
      {spotlights.instagram && (
        <p className="mt-8 text-sm text-muted">
          More spotlights on{" "}
          <a href={spotlights.instagram} target="_blank" rel="noreferrer" className="font-medium text-navy underline underline-offset-4">
            our Instagram
          </a>
          .
        </p>
      )}
    </Section>
  );
}
