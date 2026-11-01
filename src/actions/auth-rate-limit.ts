"use server";

import { formSubmissionBlocked } from "@/lib/form-rate-limit";

/** Fail closed before a sign-in attempt when the limiter cannot be checked. */
export async function gateAuthAttempt(): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await formSubmissionBlocked("auth-form");
  if (blocked) return { ok: false, error: blocked };
  return { ok: true };
}
