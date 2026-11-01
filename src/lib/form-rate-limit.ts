import { headers } from "next/headers";
import { clientAddress, consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const TEN_MINUTES = 600;

const FORM_LIMITS = {
  contact: { ipLimit: 5, userLimit: 5, windowSeconds: TEN_MINUTES },
  newsletter: { ipLimit: 5, userLimit: 5, windowSeconds: TEN_MINUTES },
  comment: { ipLimit: 8, userLimit: 8, windowSeconds: TEN_MINUTES },
  "auth-form": { ipLimit: 10, userLimit: 10, windowSeconds: TEN_MINUTES },
} as const;

export async function formSubmissionBlocked(scope: keyof typeof FORM_LIMITS): Promise<string | null> {
  const headerList = await headers();
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  } catch {
    userId = null;
  }

  const result = await consumeRateLimit({
    scope,
    ip: clientAddress((name) => headerList.get(name)),
    userId,
    ...FORM_LIMITS[scope],
    failClosed: true,
  });
  if (result.ok) return null;
  return "Too many attempts. Please wait a few minutes and try again.";
}
