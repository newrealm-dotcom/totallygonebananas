import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HAS_ACCOUNT_COOKIE, hasAccountCookieOptions } from "@/lib/auth-next";
import { getSupabaseEnv } from "@/lib/env";
import { REFERRAL_COOKIE, sanitizeReferral } from "@/lib/referral";

const PROTECTED = [/^\/profile(\/|$)/, /^\/recipes\/new$/, /^\/recipes\/[^/]+\/edit$/, /^\/admin(\/|$)/];

/** Refreshes the auth session cookie on every request and guards signed-in-only pages. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it keeps the session fresh.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // Remember that this browser has an account so the header can say "Sign In" after logout.
  if (signedIn && request.cookies.get(HAS_ACCOUNT_COOKIE)?.value !== "1") {
    response.cookies.set(HAS_ACCOUNT_COOKIE, "1", hasAccountCookieOptions());
  }

  const path = request.nextUrl.pathname;

  // Remember invite attribution from UTM so it survives sign-in and the submit form.
  if (path === "/recipes/new" || path === "/login") {
    let fromQuery = sanitizeReferral(request.nextUrl.searchParams.get("utm_content"));
    if (!fromQuery) {
      const next = request.nextUrl.searchParams.get("next");
      if (next) {
        try {
          const decoded = decodeURIComponent(next);
          const q = decoded.includes("?") ? decoded.slice(decoded.indexOf("?") + 1) : "";
          fromQuery = sanitizeReferral(new URLSearchParams(q).get("utm_content"));
        } catch {
          /* ignore */
        }
      }
    }
    if (fromQuery) {
      response.cookies.set(REFERRAL_COOKIE, fromQuery, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
      });
    }
  }

  if (!signedIn && PROTECTED.some((re) => re.test(path))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}
