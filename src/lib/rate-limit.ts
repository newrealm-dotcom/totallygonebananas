import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MINUTE = 60;

export interface RatePolicy {
  scope: string;
  ipLimit: number;
  userLimit: number;
  windowSeconds: number;
}

/**
 * Caps for one identity inside a fixed window.
 * IP limits are higher so a shared network is not blocked by one neighbor.
 * Signed-in requests must pass both the IP cap and the user cap.
 */
export function policyForRequest(method: string, pathname: string, isServerAction: boolean): RatePolicy | null {
  if (pathname.startsWith("/api/social-image")) {
    return { scope: "image", ipLimit: 300, userLimit: 120, windowSeconds: MINUTE };
  }
  if (pathname.startsWith("/api/tiktok") || pathname.startsWith("/api/pinterest")) {
    return { scope: "oauth", ipLimit: 30, userLimit: 20, windowSeconds: MINUTE };
  }
  if (pathname.startsWith("/api/")) {
    return { scope: "api", ipLimit: 300, userLimit: 120, windowSeconds: MINUTE };
  }
  if (pathname.startsWith("/auth/")) {
    return { scope: "auth", ipLimit: 40, userLimit: 20, windowSeconds: MINUTE };
  }
  if (isServerAction && method === "POST") {
    return { scope: "action", ipLimit: 60, userLimit: 40, windowSeconds: MINUTE };
  }
  return null;
}

export function clientAddress(get: (name: string) => string | null): string {
  const real = get("x-real-ip")?.trim();
  if (real && real.length <= 80) return real;
  const first = get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first && first.length <= 80) return first;
  return "unknown";
}

export interface ConsumeRateLimitInput {
  scope: string;
  ip: string;
  userId: string | null;
  ipLimit: number;
  userLimit: number;
  windowSeconds: number;
}

export type RateLimitDecision = { ok: true; remaining?: number } | { ok: false; retryAfter: number };

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let missingKeyWarned = false;

/** Stable pepper so the buckets table stores a hash, not the raw IP or user id. */
const PEPPER = "tgb-rate-v1";

async function bucketKey(scope: string, kind: "ip" | "user", value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${PEPPER}:${kind}:${value}`));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${scope}:${kind}:${hex}`;
}

interface ConsumeRow {
  allowed?: boolean;
  remaining?: number;
  retry_after?: number;
}

function parseDecision(data: unknown, windowSeconds: number): RateLimitDecision {
  const row = (typeof data === "string" ? JSON.parse(data) : data) as ConsumeRow;
  if (row?.allowed === false) {
    const retryAfter = Number(row.retry_after);
    return { ok: false, retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : windowSeconds };
  }
  const remaining = Number(row?.remaining);
  return { ok: true, remaining: Number.isFinite(remaining) ? remaining : undefined };
}

/** Counts this request against the IP bucket and, when signed in, the user bucket. Fails open if the check itself errors. */
export async function consumeRateLimit(input: ConsumeRateLimitInput): Promise<RateLimitDecision> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    if (!missingKeyWarned) {
      missingKeyWarned = true;
      console.error("Rate limiting is off until SUPABASE_SERVICE_ROLE_KEY is set.");
    }
    return { ok: true };
  }

  const keys = [await bucketKey(input.scope, "ip", input.ip)];
  const limits = [input.ipLimit];
  if (input.userId && USER_ID.test(input.userId)) {
    keys.push(await bucketKey(input.scope, "user", input.userId));
    limits.push(input.userLimit);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_keys: keys,
      p_limits: limits,
      p_window_seconds: input.windowSeconds,
    });
    if (error) {
      console.error("rate limit check failed", error.message);
      return { ok: true };
    }
    return parseDecision(data, input.windowSeconds);
  } catch (error) {
    console.error("rate limit check failed", error instanceof Error ? error.message : "unknown");
    return { ok: true };
  }
}

export async function enforceRequestRateLimit(request: NextRequest, userId: string | null): Promise<RateLimitDecision> {
  const policy = policyForRequest(
    request.method,
    request.nextUrl.pathname,
    request.headers.has("next-action"),
  );
  if (!policy) return { ok: true };
  return consumeRateLimit({
    scope: policy.scope,
    ip: clientAddress((name) => request.headers.get(name)),
    userId,
    ipLimit: policy.ipLimit,
    userLimit: policy.userLimit,
    windowSeconds: policy.windowSeconds,
  });
}
