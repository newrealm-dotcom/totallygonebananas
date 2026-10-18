"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { subscribeNewsletter } from "@/actions/newsletter";
import { trackButtonClick, trackEvent, trackFormFill } from "@/lib/analytics/datalayer";

const STORAGE_KEY = "tgb-scroll-engagement-popup";
const SHOW_AT_SCROLL = 0.33;

type Gate = "eligible" | "done";

function readGate(): Gate {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done" ? "done" : "eligible";
  } catch {
    return "done";
  }
}

function writeDone() {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* ignore quota / private mode */
  }
}

export function ScrollEngagementPopup() {
  const titleId = useId();
  const inputId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>(() => readGate());
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gate !== "eligible" || open) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const progress = (window.scrollY || doc.scrollTop || 0) / maxScroll;
      if (progress >= SHOW_AT_SCROLL) setOpen(true);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [gate, open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function closePopup() {
    writeDone();
    setGate("done");
    setOpen(false);
  }

  function onJoinClick() {
    trackButtonClick("Join the bunch, it's free", { source: "scroll_engagement_popup", intent: "join" });
    trackEvent("signup_gate", { source: "scroll_engagement_popup", intent: "join", path: pathname });
    closePopup();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await subscribeNewsletter({ email, source: "scroll_engagement_popup" });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      closePopup();
      setEmail("");
      trackEvent("newsletter_signup", { source: "scroll_engagement_popup" });
      trackFormFill("newsletter", { source: "scroll_engagement_popup" });
    });
  }

  if (!open || gate !== "eligible") return null;

  const next = encodeURIComponent(pathname || "/");

  return (
    <div className="scroll-popup" role="presentation">
      <button type="button" className="scroll-popup-backdrop" aria-label="Close signup popup" onClick={closePopup} />
      <section className="scroll-popup-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button ref={closeRef} type="button" className="scroll-popup-close" aria-label="Close" onClick={closePopup}>
          <span aria-hidden="true">×</span>
        </button>

        <div className="scroll-popup-join" aria-labelledby={titleId}>
          <div className="scroll-popup-join-copy">
            <p className="scroll-popup-kicker">Join the bunch</p>
            <h2 id={titleId}>Save your favorites and share your own</h2>
            <p>
              Save recipes, rate what you bake, and share your own banana wins. Members get first dibs on contests and
              giveaways.
            </p>
            <Link className="btn scroll-popup-join-btn" href={`/login?next=${next}&intent=join`} onClick={onJoinClick}>
              Join the bunch, it&apos;s free
            </Link>
          </div>
          <div className="scroll-popup-join-art" aria-hidden="true">
            <Image
              src="/images/finish.webp"
              alt=""
              width={1200}
              height={638}
              sizes="(max-width: 640px) 75vw, 36vw"
              className="scroll-popup-join-img"
            />
          </div>
        </div>

        <form className="scroll-popup-newsletter" onSubmit={onSubmit} noValidate>
          <h3>Want to keep in touch with what&apos;s cooking and our latest banana musings? Join our newsletter.</h3>
          <div className="scroll-popup-newsletter-row">
            <label className="sr-only" htmlFor={inputId}>
              Email
            </label>
            <input
              id={inputId}
              className="field scroll-popup-newsletter-input"
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
            <button className="btn scroll-popup-newsletter-btn" type="submit" disabled={pending}>
              {pending ? "Joining…" : "Subscribe"}
            </button>
          </div>
          {errors.email || errors.form ? (
            <p className="f-err scroll-popup-newsletter-err" role="alert">
              {errors.email || errors.form}
            </p>
          ) : null}
        </form>

        <div className="scroll-popup-newsletter-art" aria-hidden="true">
          <Image
            src="/images/footer-img.png"
            alt=""
            width={1200}
            height={420}
            sizes="(max-width: 640px) 75vw, 52vw"
            className="scroll-popup-newsletter-img"
          />
        </div>
      </section>
    </div>
  );
}
