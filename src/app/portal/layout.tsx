import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Member Portal", template: "%s | AKPsi Purdue Portal" },
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return children;
}
