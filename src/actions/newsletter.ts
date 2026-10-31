"use server";

import { Resend } from "resend";
import { siteUrl } from "@/lib/env";
import { newsletterContinuePath } from "@/lib/newsletter-next";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { formSubmissionBlocked } from "@/lib/form-rate-limit";
import { fieldErrors, newsletterInput } from "@/lib/validation";

export type NewsletterSignupResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

const NEWSLETTER_TO =
  process.env.NEWSLETTER_TO_EMAIL?.trim() || "newsletter@totallygonebananas.com";
const NEWSLETTER_FROM =
  process.env.CONTACT_FROM_EMAIL?.trim() ||
  "Totally Gone Bananas <noreply@totallygonebananas.com>";

export async function subscribeNewsletter(raw: unknown): Promise<NewsletterSignupResult> {
  const parsed = newsletterInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const email = parsed.data.email;
  const source = parsed.data.source || "footer";
  const captcha = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!captcha.ok) return { ok: false, errors: { form: captcha.error } };
  const limited = await formSubmissionBlocked("newsletter");
  if (limited) return { ok: false, errors: { form: limited } };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return { ok: false, errors: { form: "Newsletter signup isn't configured yet. Please try again later." } };
  }
  const { data, error } = await supabase
    .from("newsletter_signups")
    .insert({ email, source })
    .select("id")
    .maybeSingle();

  if (error) {
    // Already subscribed — treat as success; don't re-notify.
    if (error.code === "23505") return { ok: true };
    return { ok: false, errors: { form: "Couldn't save your signup. Please try again." } };
  }

  if (!data) return { ok: true };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // Signup is stored; email notify is optional if Resend isn't configured.
    return { ok: true };
  }

  const continueUrl = new URL(newsletterContinuePath(email), siteUrl()).toString();
  const resend = new Resend(apiKey);
  await Promise.allSettled([
    resend.emails.send({
      from: NEWSLETTER_FROM,
      to: [email],
      subject: "You're on the Totally Gone Bananas list",
      text: [
        "You're on the list.",
        "",
        "We'll send what's cooking and the latest banana musings to this address.",
        "",
        `Create your free Banana Stand: ${continueUrl}`,
      ].join("\n"),
    }),
    resend.emails.send({
      from: NEWSLETTER_FROM,
      to: [NEWSLETTER_TO],
      replyTo: email,
      subject: `Newsletter signup: ${email}`,
      text: [`New newsletter signup`, ``, `Email: ${email}`, `Source: ${source}`].join("\n"),
    }),
  ]);

  return { ok: true };
}
