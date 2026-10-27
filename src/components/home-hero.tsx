"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import heroPhoto from "../../public/images/chapter/pi-omega-chapter-hero.jpg";

/*
  Full-screen home hero: the chapter photo, blurred ahead of time (a live CSS
  blur is slow on phones) and darkened, drifting slowly behind the headline. The drift pauses with the button (WCAG 2.2.2) and doesn't run at
  all with "reduce motion" on. Styles: .hero-* in globals.css.

  To change the photo: replace public/images/chapter/pi-omega-chapter-hero.jpg
  with a blurred, ~1600px-wide JPEG (any photo works; blur hides low resolution).
*/
type Props = {
  eyebrow: string;
  lead: string;
  emphasis: string;
  intro: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
};

export function HomeHero({ eyebrow, lead, emphasis, intro, primary, secondary }: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <section
      className="hero relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden bg-navy-deep text-white sm:items-center"
      data-paused={paused}
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src={heroPhoto}
          alt=""
          fill
          sizes="100vw"
          placeholder="blur"
          preload
          className="hero-photo object-cover"
        />
        {/* Navy wash: darkest behind the text, lighter toward the right. */}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(8_27_48/0.9)_0%,rgb(8_27_48/0.75)_45%,rgb(8_27_48/0.45)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-deep to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-28">
        <p className="hero-in text-xs font-semibold uppercase tracking-[0.25em] text-gold" style={{ "--d": "0ms" } as React.CSSProperties}>
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
          <span className="hero-in block" style={{ "--d": "120ms" } as React.CSSProperties}>
            {lead}
          </span>
          <span className="hero-in block italic text-gold" style={{ "--d": "260ms" } as React.CSSProperties}>
            {emphasis}
          </span>
        </h1>
        <p className="hero-in mt-6 max-w-xl text-lg text-white/85 sm:text-xl" style={{ "--d": "420ms" } as React.CSSProperties}>
          {intro}
        </p>
        <div className="hero-in mt-9 flex flex-wrap gap-3" style={{ "--d": "560ms" } as React.CSSProperties}>
          <Link
            href={primary.href}
            className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-navy transition hover:brightness-110"
          >
            {primary.label}
          </Link>
          <Link
            href={secondary.href}
            className="rounded-full border border-white/50 px-7 py-3.5 text-sm font-semibold backdrop-brightness-75 transition hover:border-white hover:bg-white/10"
          >
            {secondary.label}
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl items-center justify-between px-4 pb-6 sm:px-6">
        <a href="#mission" className="hero-cue flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white">
          <span aria-hidden className="hero-cue-arrow text-base">↓</span>
          Learn more
        </a>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white motion-reduce:hidden"
          aria-pressed={paused}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
