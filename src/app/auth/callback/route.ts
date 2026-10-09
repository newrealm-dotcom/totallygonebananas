import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  AUTH_NEXT_COOKIE,
  HAS_ACCOUNT_COOKIE,
  hasAccountCookieOptions,
  sanitizeAuthNext,
} from "@/lib/auth-next";
import { getSupabaseEnv } from "@/lib/env";

/** Finishes sign-in for magic links (token_hash) and OAuth (PKCE code). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next =
    sanitizeAuthNext(url.searchParams.get("next"), url.origin) ??
    sanitizeAuthNext(request.cookies.get(AUTH_NEXT_COOKIE)?.value, url.origin) ??
    "/profile";

  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") as EmailOtpType | null) ?? "email";

  // Build the redirect response first so session cookies are written onto it
  // (cookies().set alone can be dropped on a bare redirect in App Router).
  let response = NextResponse.redirect(new URL(next, url.origin));
  const { url: supabaseUrl, key } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL(next, url.origin));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Prefer token_hash (SSR-safe magic links). Fall back to PKCE code exchange for OAuth
  // and for older ConfirmationURL emails until the Magic Link template is updated.
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
      : { error: new Error("missing auth credentials") };

  response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });

  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "auth");
    if (next !== "/profile") login.searchParams.set("next", next);
    const failed = NextResponse.redirect(login);
    failed.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return failed;
  }

  response.cookies.set(HAS_ACCOUNT_COOKIE, "1", hasAccountCookieOptions());
  return response;
}
