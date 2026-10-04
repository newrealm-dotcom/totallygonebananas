"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SHOW_AFTER_WINDOW = 0.75;

export function SignupFloatButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setVisible(y >= window.innerHeight * SHOW_AFTER_WINDOW);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <Link className="signup-float" href="/login">
      Sign up for a free account
    </Link>
  );
}
