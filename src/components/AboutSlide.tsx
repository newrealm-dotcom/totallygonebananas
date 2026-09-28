"use client";

import { useEffect, useState } from "react";
import { HeroSlide } from "@/components/HeroSlide";

const MOBILE_MQ = "(max-width: 900px)";
const HIDE_AT = 48;
const SHOW_AT = 12;

/** On mobile, ease the about hero away while scrolling and offer a soft back-to-top control. */
export function AboutSlide({ lightSrc, darkSrc }: { lightSrc: string | null; darkSrc: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const syncMobile = () => setMobile(mq.matches);
    syncMobile();
    mq.addEventListener("change", syncMobile);

    const update = () => {
      if (!mq.matches) {
        setScrolled(false);
        return;
      }
      const y = window.scrollY;
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
  }, []);

  function goTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <>
      <div
        className={`mascot-wrap about-slide${scrolled ? " about-slide-scrolled" : ""}`}
        aria-hidden={scrolled || undefined}
      >
        <HeroSlide lightSrc={lightSrc} darkSrc={darkSrc} />
      </div>
      {mobile && (
        <button
          type="button"
          className={`about-top-btn${scrolled ? " is-visible" : ""}`}
          aria-label="Back to top"
          tabIndex={scrolled ? 0 : -1}
          onClick={goTop}
        >
          <span aria-hidden="true">↑</span>
        </button>
      )}
    </>
  );
}
