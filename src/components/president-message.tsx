import Image from "next/image";
import president from "@/data/president.json";

// "Message from the President" on the home page. Content: src/data/president.json.
// A new president means a new photo in public/images/members and new text there.
export function PresidentMessage() {
  return (
    <section className="bg-paper" aria-labelledby="president-heading">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-20 sm:px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
        <div className="reveal mx-auto w-full max-w-xs md:sticky md:top-24 md:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-alt shadow-lg ring-1 ring-black/5">
            <Image
              src={president.photo}
              alt={`${president.name}, ${president.role}`}
              fill
              sizes="(min-width: 768px) 40vw, 320px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">From the President</p>
          <h2 id="president-heading" className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
            A message from our President
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
            {president.message.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8">
            {president.signature && (
              <Image
                src={president.signature}
                alt=""
                width={326}
                height={54}
                className="h-12 w-auto"
              />
            )}
            <p className="mt-2 font-semibold text-ink">{president.name}</p>
            <p className="text-sm text-muted">{president.role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
