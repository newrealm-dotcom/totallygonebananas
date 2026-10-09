"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/actions/newsletter";

export function NewsletterSignup() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await subscribeNewsletter({ email });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setDone(true);
      setEmail("");
    });
  }

  if (done) {
    return (
      <div className="footer-newsletter is-done">
        <p className="footer-newsletter-thanks" role="status">
          You&apos;re on the list — thanks for joining the bunch.
        </p>
      </div>
    );
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
    </form>
  );
}
