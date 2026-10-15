"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const SCROLLED_HEADER_AT_PX = 24;

/** Sticky header brand mark — swaps to the compact logo shortly after scrolling. */
export function BrandLogo() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      // Compact sticky chrome before page text can pass behind the menu items.
      const next = window.scrollY >= SCROLLED_HEADER_AT_PX;
      setScrolled(next);
      document.documentElement.classList.toggle("header-scrolled", next);
      document.documentElement.classList.remove("header-stuck");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.classList.remove("header-scrolled", "header-stuck");
    };
  }, []);

  return (
    <Link className={`brand${scrolled ? " brand-scrolled" : ""}`} href="/" aria-label="Totally Gone Bananas home">
      <Image
        className="brand-logo brand-logo-default"
        src="/logo.png"
        alt=""
        width={158}
        height={171}
        priority
      />
      <Image
        className="brand-logo brand-logo-scroll brand-logo-scroll-light"
        src="/img-login.webp"
        alt=""
        width={158}
        height={105}
        priority
      />
      <Image
        className="brand-logo brand-logo-scroll brand-logo-scroll-dark"
        src="/img-login-dark.webp"
        alt=""
        width={158}
        height={105}
        priority
      />
    </Link>
  );
}
