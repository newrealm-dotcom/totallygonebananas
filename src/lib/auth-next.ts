export const AUTH_NEXT_COOKIE = "tgb-auth-next";

/** Set after a successful auth so logged-out visitors see "Sign In" instead of "Sign Up". */
export const HAS_ACCOUNT_COOKIE = "tgb_has_account";
export const HAS_ACCOUNT_MAX_AGE = 60 * 60 * 24 * 365;

export function hasAccountCookieOptions() {
  return {
    path: "/",
    maxAge: HAS_ACCOUNT_MAX_AGE,
    sameSite: "lax" as const,
  };
}

/** Path-only post-login destination, or null if unsafe. */
export function sanitizeAuthNext(raw: string | null | undefined, requestOrigin?: string): string | null {
  if (!raw) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  if (!requestOrigin) return null;
  try {
    const asUrl = new URL(decoded);
    if (asUrl.origin === requestOrigin) {
      return `${asUrl.pathname}${asUrl.search}` || "/profile";
    }
  } catch {
    /* ignore */
  }
  return null;
}
