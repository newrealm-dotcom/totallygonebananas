interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export async function verifyTurnstileToken(token: string | undefined): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = turnstileSiteKey();

  if (!secret) {
    if (process.env.NODE_ENV !== "production" && !siteKey) return { ok: true };
    return { ok: false, error: "Captcha isn't configured yet. Please try again later." };
  }
  if (!token?.trim()) return { ok: false, error: "Please complete the captcha and try again." };

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return { ok: false, error: "Captcha verification failed. Please try again." };
  const result = (await response.json()) as TurnstileResponse;
  return result.success ? { ok: true } : { ok: false, error: "Captcha verification failed. Please try again." };
}
