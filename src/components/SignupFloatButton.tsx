"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackButtonClick, trackEvent } from "@/lib/analytics/datalayer";

const SHOW_AFTER_WINDOW = 0.75;

export function SignupFloatButton() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

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

  const next = encodeURIComponent(pathname || "/");
  const href = `/login?next=${next}&intent=float`;

  return (
    <Link
      className="signup-float"
      href={href}
      onClick={() => {
        trackButtonClick("Sign up for a free account", { source: "signup_float" });
        trackEvent("signup_gate", { intent: "float", path: pathname });
      }}
    >
      Sign up for a free account
    </Link>
  );
}
