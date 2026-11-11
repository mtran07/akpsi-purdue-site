"use client";

import { usePathname } from "next/navigation";

/** Pages that stand on their own, without the site's menu and footer. */
const STANDALONE = ["/sign-in"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE.includes(pathname)) return null;
  return <>{children}</>;
}
