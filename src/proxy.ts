import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";
import { CANONICAL_SITE_URL } from "@/lib/env";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";

function requestHost(request: NextRequest): string {
  return (request.headers.get("host") ?? request.nextUrl.host).split(":")[0]?.toLowerCase() ?? "";
}

/** Permanent redirect so *.vercel.app never competes with the real domain in search / shares. */
function vercelAppRedirect(request: NextRequest): NextResponse | null {
  const host = requestHost(request);
  if (!host.endsWith(".vercel.app") && host !== "vercel.app") return null;
  const dest = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_SITE_URL);
  return NextResponse.redirect(dest, 308);
}

export async function proxy(request: NextRequest) {
  const redirect = vercelAppRedirect(request);
  if (redirect) return redirect;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, userId } = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);

  if (response.status >= 300 && response.status < 400) return response;

  const decision = await enforceRequestRateLimit(request, userId);
  if (!decision.ok) return tooManyRequests(response, csp, decision.retryAfter);
  if (decision.remaining !== undefined) {
    response.headers.set("X-RateLimit-Remaining", String(decision.remaining));
  }
  return response;
}

function tooManyRequests(session: NextResponse, csp: string, retryAfter: number): NextResponse {
  const blocked = NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
        "Content-Security-Policy": csp,
      },
    },
  );
  for (const cookie of session.headers.getSetCookie()) {
    blocked.headers.append("set-cookie", cookie);
  }
  return blocked;
}

export const config = {
  // Keep sitemap/robots out of session refresh so crawlers always get raw XML/txt.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|sitemap\\.xml|robots\\.txt|feed\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)",
  ],
};
