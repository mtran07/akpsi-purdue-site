import { NextResponse, type NextRequest } from "next/server";
import { codeIsCurrent, isOpen, makeTicket, TICKET_COOKIE } from "@/lib/checkin";
import { fetchCheckinState, isPortalConfigured } from "@/lib/portal-data";

/*
  Where the chapter check-in QR code points. Checks the rotating code right
  away (before any sign-in, so a slow Google sign-in can't make it expire),
  then hands the phone a short ticket and sends it to /portal/check-in,
  where the brother taps "Check me in". Nothing is recorded here.
*/
export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get("s") ?? "";
  const code = request.nextUrl.searchParams.get("c") ?? "";
  const page = new URL("/portal/check-in", request.url);

  if (!isPortalConfigured()) return NextResponse.redirect(page);

  let state;
  try {
    state = await fetchCheckinState();
  } catch (error) {
    console.error("Check-in scan: couldn't load the session", error);
    page.searchParams.set("error", "unavailable");
    return NextResponse.redirect(page);
  }

  const current = state.session;
  if (!current || current.id !== session || !isOpen(current)) {
    page.searchParams.set("error", "closed");
    return NextResponse.redirect(page);
  }
  if (!codeIsCurrent(current, code)) {
    page.searchParams.set("error", "expired");
    return NextResponse.redirect(page);
  }

  const response = NextResponse.redirect(page);
  response.cookies.set(TICKET_COOKIE, makeTicket(current.id), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
