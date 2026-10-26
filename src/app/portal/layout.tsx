import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Member portal", template: "%s | AKPsi Purdue portal" },
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return children;
}
