"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_signups")
    .insert({ email, source: "footer" })
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

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: NEWSLETTER_FROM,
    to: [NEWSLETTER_TO],
    replyTo: email,
    subject: `Newsletter signup: ${email}`,
    text: [`New newsletter signup`, ``, `Email: ${email}`, `Source: footer`].join("\n"),
  });

  return { ok: true };
}
