"use client";

import { useState, useTransition } from "react";
import { sendContactMessage } from "@/actions/contact";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comments, setComments] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await sendContactMessage({ name, email, comments });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="about-contact-thanks" role="status">
        Thank you for contacting us. Someone from our staff will get back to you in a timely manner.
      </p>
    );
  }

  return (
    <form className="about-contact-form stack" onSubmit={onSubmit} noValidate>
      <div className="f">
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          className="field"
          name="name"
          autoComplete="name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          required
        />
        {errors.name ? <p className="f-err">{errors.name}</p> : null}
      </div>
      <div className="f">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          maxLength={120}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          required
        />
        {errors.email ? <p className="f-err">{errors.email}</p> : null}
      </div>
      <div className="f">
        <label htmlFor="contact-comments">Your Comments</label>
        <textarea
          id="contact-comments"
          className="field"
          name="comments"
          rows={5}
          value={comments}
          maxLength={5000}
          onChange={(e) => setComments(e.target.value)}
          aria-invalid={!!errors.comments}
          required
        />
        {errors.comments ? <p className="f-err">{errors.comments}</p> : null}
      </div>
      {errors.form ? (
        <p className="f-err" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="row-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
