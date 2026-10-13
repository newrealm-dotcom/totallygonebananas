"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { Mascot } from "@/components/Mascot";

type Theme = "light" | "dark";

function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Light-mode slide from /main-slider; dark-mode slide from /main-slider/dark. SVG fallback if empty. */
export function HeroSlide({
  lightSrc,
  darkSrc,
  alt = "The Totally Gone Bananas mascot",
  sizes = "(max-width: 900px) 320px, 46vw",
}: {
  lightSrc: string | null;
  darkSrc: string | null;
  alt?: string;
  sizes?: string;
}) {
  const light = lightSrc ?? darkSrc;
  const dark = darkSrc ?? lightSrc;
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  const isDark = theme === "dark";
  if (!light && !dark) return <Mascot />;

  // Same asset for both themes — one image is enough.
  if (!light || !dark || light === dark) {
    return (
      <Image
        className="mascot hero-slide"
        src={(light ?? dark)!}
        alt={alt}
        width={920}
        height={520}
        priority
        sizes={sizes}
      />
    );
  }

  return (
    <div className="hero-slide-stack">
      <Image
        className="mascot hero-slide hero-slide-light"
        src={light}
        alt={isDark ? "" : alt}
        aria-hidden={isDark}
        width={920}
        height={520}
        priority
        sizes={sizes}
      />
      {/* Dark slide is CSS-hidden in light mode — don't mark it priority or it races LCP. */}
      <Image
        className="mascot hero-slide hero-slide-dark"
        src={dark}
        alt={isDark ? alt : ""}
        aria-hidden={!isDark}
        width={920}
        height={520}
        loading="lazy"
        sizes={sizes}
      />
    </div>
  );
}
