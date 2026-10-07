import type { Metadata } from "next";
// Fonts are self-hosted from npm so builds never depend on Google Fonts.
import "@fontsource-variable/inter";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/700.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import site from "@/data/site.json";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.akpsipurdue.com"),
  title: {
    default: `${site.chapterName} | ${site.chapter} at ${site.school}`,
    template: `%s | AKPsi Purdue`,
  },
  description:
    "Alpha Kappa Psi, Pi Omega Chapter: Purdue University's gender-inclusive professional business fraternity, open to all majors.",
  openGraph: {
    siteName: "AKPsi Purdue",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
