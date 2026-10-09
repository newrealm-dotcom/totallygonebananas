"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Sticky header brand mark — swaps to the compact logo after scrolling 10% down the page. */
export function BrandLogo() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      // Compact sticky chrome (solid bar + small logo) after this threshold.
      const next = window.scrollY >= Math.max(doc.scrollHeight * 0.1, 1);
      setScrolled(next);
      doc.classList.toggle("header-scrolled", next);
      doc.classList.remove("header-stuck");
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
