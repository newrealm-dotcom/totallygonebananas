"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Sticky header brand mark — swaps to the login art after scrolling 20% down the page. */
export function BrandLogo() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const threshold = Math.max(doc.scrollHeight * 0.2, 1);
      const next = window.scrollY >= threshold;
      setScrolled(next);
      doc.classList.toggle("header-scrolled", next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.classList.remove("header-scrolled");
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
