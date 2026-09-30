"use client";

import { useEffect } from "react";

const GAP = 14;

function overlaps(): boolean {
  const left = document.querySelector<HTMLElement>("header.top nav.main.left");
  const topEnd = document.querySelector<HTMLElement>("header.top .top-end");
  const brand = document.querySelector<HTMLElement>("header.top .brand");
  if (!left || !topEnd || !brand) return false;

  // Hidden by the CSS compact breakpoint — nothing to measure.
  if (getComputedStyle(left).display === "none") return true;

  if (left.scrollWidth > left.clientWidth + 1) return true;
  if (topEnd.scrollWidth > topEnd.clientWidth + 1) return true;

  const lr = left.getBoundingClientRect();
  const tr = topEnd.getBoundingClientRect();
  const br = brand.getBoundingClientRect();
  return lr.right > br.left - GAP || tr.left < br.right + GAP;
}

/** Collapse the full header nav into the hamburger before items collide with the logo. */
export function HeaderCompactMode() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.top");
    const wrap = header?.querySelector<HTMLElement>(".wrap");
    if (!header || !wrap) return;

    let frame = 0;
    let lastWidth = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = wrap.clientWidth;
        const compact = header.classList.contains("is-compact");

        if (compact) {
          // Only re-probe when the header gains room — avoids resize thrash.
          if (width <= lastWidth) {
            lastWidth = width;
            return;
          }
          lastWidth = width;
          header.classList.remove("is-compact");
          void header.offsetWidth;
          if (overlaps()) header.classList.add("is-compact");
          return;
        }

        lastWidth = width;
        if (overlaps()) header.classList.add("is-compact");
      });
    };

    apply();
    window.addEventListener("resize", apply);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(header);
    ro?.observe(wrap);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", apply);
      ro?.disconnect();
      header.classList.remove("is-compact");
    };
  }, []);

  return null;
}
