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
      return `${asUrl.pathname}${asUrl.search}${asUrl.hash}` || "/profile";
    }
  } catch {
    /* ignore */
  }
  return null;
}

const FRESH_ACCOUNT_MS = 20 * 60 * 1000;

/** True when the auth user was created moments ago — their first confirmation, not a later sign-in. */
export function isFreshAccount(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  return age >= 0 && age < FRESH_ACCOUNT_MS;
}

/**
 * First confirmation lands on the Banana Stand, with a welcome and a way back
 * to whatever they were trying to open.
 */
export function firstLoginDestination(next: string): string {
  const safe = sanitizeAuthNext(next) ?? "/profile";
  const pathOnly = safe.split(/[?#]/)[0] ?? safe;
  const existing = new URLSearchParams(safe.split("?")[1]?.split("#")[0] ?? "");
  const params = new URLSearchParams();
  params.set("welcome", "1");
  const priorReturn = sanitizeAuthNext(existing.get("return"));
  if (priorReturn) params.set("return", priorReturn);
  else if (pathOnly !== "/profile") params.set("return", safe);
  return withAuthJoinedFlag(`/profile?${params.toString()}`);
}

/** Append `joined=1` so the client can fire a one-time conversion beacon. */
export function withAuthJoinedFlag(path: string): string {
  const hashIdx = path.indexOf("#");
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
  const withoutHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const qIdx = withoutHash.indexOf("?");
  const pathname = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
  const search = qIdx >= 0 ? withoutHash.slice(qIdx + 1) : "";
  const params = new URLSearchParams(search);
  params.set("joined", "1");
  return `${pathname}?${params.toString()}${hash}`;
}
