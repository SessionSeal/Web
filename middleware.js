import { NextResponse } from "next/server";

/**
 * UX gate: functional pages require a session cookie; without one you
 * land on /signin with a return path. This is presence-only (edge-safe,
 * no crypto here) — Heimdall independently verifies the cookie on every
 * API call, so this gate is about experience, not security.
 */
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

export function middleware(req) {
  const hasSession = SESSION_COOKIES.some((n) => req.cookies.has(n));
  if (hasSession) return NextResponse.next();
  const url = new URL("/signin", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/verify", "/compress",
    "/stem-master-checker", "/logic-master-checker",
    "/logic", "/fingerprint", "/watermark", "/waterprint",
  ],
};
