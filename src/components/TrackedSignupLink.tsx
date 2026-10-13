"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackButtonClick, trackEvent } from "@/lib/analytics/datalayer";

/** Homepage / marketing CTA that logs signup intent to GTM. */
export function TrackedSignupLink({
  href,
  children,
  buttonText,
  intent,
  className,
}: {
  href: string;
  children: React.ReactNode;
  buttonText: string;
  intent: string;
  className?: string;
}) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        trackButtonClick(buttonText, { intent });
        trackEvent("signup_gate", { intent });
      }}
    >
      {children}
    </Link>
  );
}

export type TrackedSignupLinkProps = ComponentProps<typeof TrackedSignupLink>;
