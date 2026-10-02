"use server";

import { Resend } from "resend";
import { contactInput, fieldErrors } from "@/lib/validation";

export type SendContactResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

const CONTACT_TO = process.env.CONTACT_TO_EMAIL?.trim() || "noreply@totallygonebananas.com";
const CONTACT_FROM =
  process.env.CONTACT_FROM_EMAIL?.trim() || "Totally Gone Bananas <noreply@totallygonebananas.com>";

export async function sendContactMessage(raw: unknown): Promise<SendContactResult> {
  const parsed = contactInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { name, email, comments } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      errors: { form: "Contact email isn't configured yet. Please try again later." },
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: [CONTACT_TO],
    replyTo: email,
    subject: `Contact form: ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      "Comments:",
      comments,
    ].join("\n"),
  });

  if (error) {
    return { ok: false, errors: { form: "Couldn't send your message. Please try again in a minute." } };
  }

  return { ok: true };
}
