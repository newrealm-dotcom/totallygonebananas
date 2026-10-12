"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { subscribeNewsletter } from "@/actions/newsletter";

const STORAGE_KEY = "tgb-newsletter-popup";
const SHOW_AT_SCROLL = 0.5;

type Gate = "eligible" | "done";

function readGate(): Gate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "dismissed" || raw === "subscribed") return "done";
    return "eligible";
  } catch {
    return "done";
  }
}

function writeGate(value: "dismissed" | "subscribed") {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function NewsletterPopup() {
  const titleId = useId();
  const inputId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Client-only (ssr: false) — read localStorage on first render.
  const [gate, setGate] = useState<Gate>(() => readGate());
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gate !== "eligible" || open) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const progress = (window.scrollY || doc.scrollTop || 0) / maxScroll;
      if (progress >= SHOW_AT_SCROLL) {
        setOpen(true);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [gate, open]);

  function dismiss() {
    writeGate("dismissed");
    setGate("done");
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        writeGate("dismissed");
        setGate("done");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await subscribeNewsletter({ email, source: "popup" });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      writeGate("subscribed");
      setDone(true);
      setEmail("");
    });
  }

  if (!open || gate !== "eligible") return null;

  return (
    <div className="newsletter-popup" role="presentation">
      <button
        type="button"
        className="newsletter-popup-backdrop"
        aria-label="Close newsletter signup"
        onClick={dismiss}
      />
      <div
        className="newsletter-popup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          ref={closeRef}
          type="button"
          className="newsletter-popup-close"
          aria-label="Close"
          onClick={dismiss}
        >
          <span aria-hidden="true">×</span>
        </button>

        {done ? (
          <p className="newsletter-popup-thanks" role="status">
            You&apos;re on the list — thanks for joining the bunch.
          </p>
        ) : (
          <form className="newsletter-popup-form" onSubmit={onSubmit} noValidate>
            <h2 className="newsletter-popup-pitch" id={titleId}>
              Want to keep in touch with what&apos;s cooking and our latest banana musings? Join our
              newsletter.
            </h2>
            <div className="newsletter-popup-row">
              <label className="sr-only" htmlFor={inputId}>
                Email
              </label>
              <input
                id={inputId}
                className="field newsletter-popup-input"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                maxLength={120}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email || !!errors.form}
                required
              />
              <button className="btn newsletter-popup-btn" type="submit" disabled={pending}>
                {pending ? "Joining…" : "Subscribe"}
              </button>
            </div>
            {errors.email || errors.form ? (
              <p className="f-err newsletter-popup-err" role="alert">
                {errors.email || errors.form}
              </p>
            ) : null}
          </form>
        )}

        <div className="newsletter-popup-art" aria-hidden="true">
          <Image
            src="/images/footer-img.png"
            alt=""
            width={1200}
            height={420}
            sizes="(max-width: 640px) 92vw, 36rem"
            className="newsletter-popup-img"
          />
        </div>
      </div>
    </div>
  );
}
