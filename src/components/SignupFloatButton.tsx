"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HIDE_AFTER_MS = 15_000;
const HIDE_AFTER_SCROLL = 0.25;
const MOBILE_MQ = "(max-width: 900px)";

export function SignupFloatButton() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const mq = window.matchMedia(MOBILE_MQ);
    let timer = 0;

    const hide = () => setVisible(false);

    const clearTimer = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };

    const armTimer = () => {
      clearTimer();
      if (mq.matches) timer = window.setTimeout(hide, HIDE_AFTER_MS);
    };

    const onScroll = () => {
      if (!mq.matches) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y / max >= HIDE_AFTER_SCROLL) hide();
    };

    armTimer();
    onScroll();
    mq.addEventListener("change", armTimer);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimer();
      mq.removeEventListener("change", armTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Link className="signup-float" href="/login">
      Sign up for a free account
    </Link>
  );
}
