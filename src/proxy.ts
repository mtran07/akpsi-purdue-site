import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

/*
  Runs before every portal request. Reading the session here lets Auth.js
  refresh the "is this a member?" answer in the session cookie every few
  minutes (the jwt callback in src/auth.ts), so pages don't have to ask the
  Google Sheet on every click.

  When the cookie is refreshed, the new value is also handed to this same
  request's page render, so the page doesn't repeat the check with the old
  cookie. This never blocks anyone: the pages and src/lib/dal.ts still
  decide what each visitor may see.
*/
const runAuth = auth as unknown as (request: NextRequest) => Promise<Response>;

export default async function proxy(request: NextRequest) {
  const authResponse = await runAuth(request);
  const setCookies = authResponse.headers.getSetCookie();
  if (setCookies.length === 0) return authResponse;

  // Apply the refreshed cookies to the request the page will see.
  const jar = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  for (const header of setCookies) {
    const [pair, ...attributes] = header.split(";");
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attributes.some((a) => /^\s*max-age=0\s*$/i.test(a) || /^\s*expires=.*1970/i.test(a));
    if (expired || !value) jar.delete(name);
    else jar.set(name, value);
  }
  const headers = new Headers(request.headers);
  headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));

  const response = NextResponse.next({ request: { headers } });
  for (const header of setCookies) response.headers.append("set-cookie", header);
  return response;
}

export const config = {
  matcher: ["/portal", "/portal/:path*"],
};
