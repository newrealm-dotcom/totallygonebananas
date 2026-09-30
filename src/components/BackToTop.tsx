"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER = 320;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setVisible(y > SHOW_AFTER);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function goTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    const root = document.scrollingElement ?? document.documentElement;
    root.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  }

  return (
    <button
      type="button"
      className={`back-to-top${visible ? " is-visible" : ""}`}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={goTop}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
