"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HeroSlide } from "@/components/HeroSlide";

const MOBILE_MQ = "(max-width: 900px)";
const HIDE_AT = 48;
const SHOW_AT = 2;

/** On mobile, ease the about hero away while scrolling and offer a soft back-to-top control. */
export function AboutSlide({ lightSrc, darkSrc }: { lightSrc: string | null; darkSrc: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const syncMobile = () => setMobile(mq.matches);
    syncMobile();
    mq.addEventListener("change", syncMobile);

    const update = () => {
      if (!mq.matches) {
        setScrolled(false);
        setReturning(false);
        return;
      }
      const y = window.scrollY || document.documentElement.scrollTop || 0;

      // While smooth-scrolling home, keep the hero collapsed until we actually arrive.
      if (returning) {
        if (y <= SHOW_AT) {
          setReturning(false);
          setScrolled(false);
        }
        return;
      }

      setScrolled((was) => {
        if (!was && y > HIDE_AT) return true;
        if (was && y <= SHOW_AT) return false;
        return was;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      mq.removeEventListener("change", syncMobile);
    };
  }, [returning]);

  function goTop() {
    setReturning(true);
    setScrolled(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    const root = document.scrollingElement ?? document.documentElement;
    root.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
    if (reduce) {
      setReturning(false);
      setScrolled(false);
    }
  }

  return (
    <>
      <div
        className={`mascot-wrap about-slide${scrolled ? " about-slide-scrolled" : ""}`}
        aria-hidden={scrolled || undefined}
      >
        <HeroSlide lightSrc={lightSrc} darkSrc={darkSrc} />
      </div>
      {mobile
        ? createPortal(
            <button
              type="button"
              className={`about-top-btn${scrolled ? " is-visible" : ""}`}
              aria-label="Back to top"
              tabIndex={scrolled ? 0 : -1}
              onClick={goTop}
            >
              <span aria-hidden="true">↑</span>
            </button>,
            document.body,
          )
        : null}
    </>
  );
}
