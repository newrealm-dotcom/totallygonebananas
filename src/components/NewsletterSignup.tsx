"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeNewsletter } from "@/actions/newsletter";
import { TurnstileField } from "@/components/TurnstileField";
import { trackEvent, trackFormFill } from "@/lib/analytics/datalayer";
import { newsletterContinuePath } from "@/lib/newsletter-next";

export function NewsletterSignup() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const formToken = new FormData(e.currentTarget).get("cf-turnstile-response");
    const captchaToken = turnstileToken || (typeof formToken === "string" ? formToken : "");
    startTransition(async () => {
      const result = await subscribeNewsletter({ email, turnstileToken: captchaToken });
      if (!result.ok) {
        setErrors(result.errors);
        setTurnstileResetKey((v) => v + 1);
        return;
      }
      const clean = email.trim();
      trackEvent("newsletter_signup", { source: "footer" });
      trackFormFill("newsletter", { source: "footer" });
      router.push(newsletterContinuePath(clean));
    });
  }

  return (
    <form className="footer-newsletter" onSubmit={onSubmit} noValidate>
      <h2 className="footer-newsletter-pitch" id="footer-newsletter-label">
        Want to keep in touch with what&apos;s cooking and our latest banana musings? Join our
        newsletter.
      </h2>
      <div className="footer-newsletter-row">
        <label className="sr-only" htmlFor="footer-newsletter-email">
          Email
        </label>
        <input
          id="footer-newsletter-email"
          className="field footer-newsletter-input"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          maxLength={120}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email || !!errors.form}
          aria-describedby="footer-newsletter-label"
          required
        />
        <button className="btn footer-newsletter-btn" type="submit" disabled={pending}>
          {pending ? "Joining…" : "Subscribe"}
        </button>
      </div>
      {errors.email || errors.form ? (
        <p className="f-err footer-newsletter-err" role="alert">
          {errors.email || errors.form}
        </p>
      ) : null}
      <TurnstileField onTokenChange={onTurnstileToken} resetKey={turnstileResetKey} />
    </form>
  );
}
