import "server-only";
import { cacheLife } from "next/cache";
import { fetchPublicRoster } from "@/lib/portal-data";
import type { Brother } from "@/lib/portal-types";

/**
 * Active brothers for the public Members page: names, pledge class, class
 * year, major, position and LinkedIn only (the Apps Script never sends
 * contact info for this). Refreshes about hourly after the Roster tab
 * changes. If the sheet can't be reached, returns null and tries again
 * within minutes instead of caching an empty list.
 */
export async function getPublicRoster(): Promise<Brother[] | null> {
  "use cache";
  try {
    const brothers = await fetchPublicRoster();
    cacheLife("hours");
    // Belt and braces: never let contact fields onto a public page.
    return brothers.map(({ id, name, pledgeClass, gradYear, major, position, linkedin }) => ({
      id,
      name,
      pledgeClass,
      gradYear,
      major,
      position,
      linkedin,
    }));
  } catch (error) {
    console.error("Couldn't load the public roster", error);
    cacheLife("minutes");
    return null;
  }
}
