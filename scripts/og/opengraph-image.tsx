import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import site from "@/data/site.json";

// Template for the link-preview card (src/app/opengraph-image.jpg), the image
// shown when a link to the site is shared in iMessage, GroupMe, LinkedIn...
// It's kept here, not in src/app, so the site serves a small fixed JPEG.
// To regenerate after changing the photo or text: copy this file to
// src/app/opengraph-image.tsx, run the site, open /opengraph-image, save it
// as JPEG (1200x630, under ~150 KB) to src/app/opengraph-image.jpg, then
// delete the copy.

export const alt = "Alpha Kappa Psi, Pi Omega Chapter at Purdue University: Shaping People, Shaping Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "node_modules/@fontsource/libre-baskerville/files");

export default async function Image() {
  const [regular, bold, photo] = await Promise.all([
    readFile(join(fontDir, "libre-baskerville-latin-400-normal.woff")),
    readFile(join(fontDir, "libre-baskerville-latin-700-normal.woff")),
    readFile(join(process.cwd(), "public/images/chapter/pi-omega-chapter-hero.jpg")),
  ]);
  const photoUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#081b30" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page */}
        <img src={photoUrl} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            backgroundImage: "linear-gradient(100deg, rgba(8,27,48,0.94) 0%, rgba(8,27,48,0.8) 50%, rgba(8,27,48,0.5) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: "100%" }}>
          <div style={{ fontSize: 24, letterSpacing: 6, color: "#c9a227", textTransform: "uppercase" }}>
            {`${site.school} · ${site.chapter}`}
          </div>
          <div style={{ fontSize: 88, fontWeight: 700, color: "white", marginTop: 24, lineHeight: 1.05 }}>
            {site.chapterName}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#c9a227", marginTop: 20 }}>Shaping People, Shaping Business.</div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.85)", marginTop: 36, maxWidth: 820 }}>
            Purdue&apos;s premier professional business fraternity, open to every major.
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 48 }}>
            <div style={{ width: 64, height: 4, background: "#c9a227" }} />
            <div style={{ fontSize: 24, color: "white", marginLeft: 20 }}>akpsipurdue.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Libre Baskerville", data: regular, weight: 400, style: "normal" },
        { name: "Libre Baskerville", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
