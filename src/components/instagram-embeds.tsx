"use client";

import { useEffect, useRef } from "react";

// Official Instagram embeds (carousel posts get slide arrows). Instagram's
// script is heavy, so it only loads once the section is close to the screen.
// Until then, or if it's blocked, each card is a plain link to the post.

type Post = { url: string; label?: string };

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const SCRIPT_SRC = "https://www.instagram.com/embed.js";

/** Normalizes a pasted link to https://www.instagram.com/p/<id>/ (or null if it isn't a post). */
function permalink(url: string) {
  const match = url.match(/^https:\/\/(?:www\.)?instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
}

function loadInstagram() {
  if (window.instgrm) {
    window.instgrm.Embeds.process();
    return;
  }
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  script.async = true;
  script.onload = () => window.instgrm?.Embeds.process();
  document.body.appendChild(script);
}

export function InstagramEmbeds({ posts }: { posts: Post[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadInstagram();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const valid = posts.flatMap((post) => {
    const link = permalink(post.url);
    return link ? [{ ...post, link }] : [];
  });

  return (
    <div ref={ref} className="grid items-start justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
      {valid.map((post) => (
        <div key={post.link} className="w-full max-w-[540px]">
          {post.label && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">{post.label}</p>
          )}
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={`${post.link}?utm_source=ig_embed`}
            data-instgrm-version="14"
            data-instgrm-captioned
            style={{ margin: 0, minWidth: 0, width: "100%", maxWidth: 540 }}
          >
            <a
              href={post.link}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-line bg-white p-6 text-center text-navy transition hover:border-navy"
            >
              <span className="font-semibold">{post.label ?? "View this post"}</span>
              <span className="text-sm text-muted">View on Instagram →</span>
            </a>
          </blockquote>
        </div>
      ))}
    </div>
  );
}
