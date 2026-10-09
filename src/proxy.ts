import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_SITE_URL } from "@/lib/env";
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
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)"],
};
