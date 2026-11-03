"use client";

import { useEffect, useLayoutEffect } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Switch as soon as two header controls would touch. */
const GAP = 2;

function boxesMeet(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right + GAP && a.right > b.left - GAP && a.top < b.bottom && a.bottom > b.top;
}

function visible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function overlaps(): boolean {
  const header = document.querySelector<HTMLElement>("header.top");
  const wrap = header?.querySelector<HTMLElement>(":scope > .wrap");
  const nav = header?.querySelector<HTMLElement>("nav.main.left");
  const topEnd = header?.querySelector<HTMLElement>(".top-end");
  const brand = header?.querySelector<HTMLElement>(".brand");
  if (!header || !wrap || !nav || !topEnd || !brand) return false;

  // Narrow CSS breakpoint already hides the row. Stay on the hamburger.
  if (getComputedStyle(nav).display === "none") return true;

  const leftItems = [...nav.querySelectorAll<HTMLElement>(":scope > a, :scope > .top-blog-menu, :scope > .top-more")].filter(visible);
  const rightItems = [...topEnd.querySelectorAll<HTMLElement>(".theme-toggle, .top-add-recipe, .top-sign-in, .profile-menu")].filter(visible);
  const items = [...leftItems, ...rightItems];
  const brandBox = brand.getBoundingClientRect();
  const style = getComputedStyle(wrap);
  const wrapBox = wrap.getBoundingClientRect();
  const contentLeft = wrapBox.left + parseFloat(style.paddingLeft);
  const contentRight = wrapBox.right - parseFloat(style.paddingRight);

  for (const el of items) {
    const box = el.getBoundingClientRect();
    if (box.left < contentLeft - 1 || box.right > contentRight + 1) return true;
    if (boxesMeet(box, brandBox)) return true;
  }

  for (let i = 0; i < items.length; i++) {
    const a = items[i].getBoundingClientRect();
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].contains(items[j]) || items[j].contains(items[i])) continue;
      if (boxesMeet(a, items[j].getBoundingClientRect())) return true;
    }
  }

  return false;
}

/** Collapse the full header nav into the hamburger the moment any controls would overlap. */
export function HeaderCompactMode() {
  useIsoLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>("header.top");
    const wrap = header?.querySelector<HTMLElement>(":scope > .wrap");
    if (!header || !wrap) return;

    let frame = 0;
    let lastWidth = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = wrap.clientWidth;
        const compact = header.classList.contains("is-compact");

        if (compact) {
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
    document.fonts?.ready.then(apply).catch(() => {});
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
