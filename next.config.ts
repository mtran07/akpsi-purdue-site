import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Excusal proof photos (shrunk in the browser to well under 2 MB first).
      bodySizeLimit: "3mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    // Headshots are still served from Wix during the build. Before the Wix plan
    // is cancelled (Dec 21), run `npm run images:pull` to copy them into
    // /public/images and remove this entry. See docs/TASKS.md.
    remotePatterns: [new URL("https://static.wixstatic.com/media/**")],
  },

  // Old Wix URLs → new pages, so Linktree, flyers and search results keep working.
  // Source of truth for the list: the Wix sitemap audit (Oct 7, 2026).
  async redirects() {
    return [
      { source: "/executive-board", destination: "/members", permanent: true },
      { source: "/committee-heads", destination: "/members#committee-heads", permanent: true },
      { source: "/our-partners", destination: "/contact", permanent: true },
      { source: "/social-media", destination: "/media", permanent: true },
      { source: "/member-login", destination: "/portal", permanent: true },
      { source: "/alumnidirectory/:path*", destination: "/portal", permanent: true },
      // Leftover Wix pages with no content worth keeping.
      { source: "/blank", destination: "/", permanent: true },
      { source: "/blank-1", destination: "/", permanent: true },
      { source: "/copy-of-brother-search", destination: "/", permanent: true },
      { source: "/search-feature", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
