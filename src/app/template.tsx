/*
  Re-mounts on every navigation, so the new page gets a quick fade-in.
  Enter-only on purpose: nothing waits for the old page to fade out, which
  kept clicks instant (an earlier fade-out + fade-in transition added ~450 ms).
*/
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
