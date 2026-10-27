import { ViewTransition } from "react";

// Templates remount on every navigation, so this fades the old page out and
// the new one in (React <ViewTransition> + the browser's View Transitions API).
// Browsers without support just switch pages instantly. Styles: globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
