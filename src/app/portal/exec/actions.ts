"use server";

import { getOfficer, getViewer } from "@/lib/dal";
import { decideMember } from "@/lib/portal-data";

export type DecideResult = { ok: true; message: string } | { ok: false; message: string };

/** Approve or decline an access request from the exec dashboard (officers only). */
export async function decideAccess(email: string, decision: "approve" | "decline"): Promise<DecideResult> {
  const viewer = await getViewer();
  const officer = await getOfficer();
  if (viewer.status !== "member" || !officer) return { ok: false, message: "Officers only." };
  if (typeof email !== "string" || !email.includes("@") || (decision !== "approve" && decision !== "decline")) {
    return { ok: false, message: "That request couldn't be read." };
  }
  try {
    const r = await decideMember(viewer.email, email, decision);
    // No page refresh here: the row stays put with its confirmation, and the
    // dashboard shows the updated list on the next visit.
    switch (r.result) {
      case "approved":
        return { ok: true, message: r.emailed ? "Approved. Welcome email sent." : "Approved. The welcome email didn't send; let them know yourself." };
      case "declined":
        return { ok: true, message: "Declined. They can't request again from this email." };
      case "not-pending":
        return { ok: true, message: "Someone already handled this one." };
      default:
        return { ok: false, message: "That request isn't on the Members tab anymore." };
    }
  } catch (error) {
    console.error("decideAccess failed", error);
    return { ok: false, message: "That didn't go through. Try again, or change Status on the Members tab." };
  }
}
