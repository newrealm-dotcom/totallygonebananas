"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const HIDE_AFTER_MS = 10_000;
const FADE_MS = 450;

/**
 * Peeks up from behind the footer top over the last page section.
 * Settles at 70% visible, holds 10s, then disappears.
 */
export function FooterPeekImage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);
  const settledRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gone) return;

    function update() {
      const root = rootRef.current;
      const footer = root?.closest("footer");
      if (!footer) return;

      const viewH = window.innerHeight;
      const rect = footer.getBoundingClientRect();
      const revealRange = Math.max(100, Math.min(viewH * 0.35, 280));
      const next = Math.min(1, Math.max(0, (viewH - rect.top) / revealRange));
      setProgress(next);

      if (next >= 1 && !settledRef.current) {
        settledRef.current = true;
        hideTimerRef.current = setTimeout(() => {
          setHiding(true);
          fadeTimerRef.current = setTimeout(() => setGone(true), FADE_MS);
        }, HIDE_AFTER_MS);
      }
    }

    const startId = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(startId);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [gone]);

  if (gone) return null;

  // 0% = fully behind the footer; -70% = peek farther over the section above.
  const translate = -progress * 70;

  return (
    <div
      ref={rootRef}
      className={`footer-peek${hiding ? " is-hiding" : ""}`}
      style={{ transform: `translate3d(0, ${translate}%, 0)` }}
      aria-hidden="true"
    >
      <Image
        src="/images/bottom-img.png"
        alt=""
        width={600}
        height={600}
        sizes="30vmin"
        unoptimized
        priority={false}
      />
    </div>
  );
}
