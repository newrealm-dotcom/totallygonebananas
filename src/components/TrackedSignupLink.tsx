"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { trackButtonClick, trackEvent } from "@/lib/analytics/datalayer";
import {
  HOME_JOIN_INTERACTED_KEY,
  readHasAccountCookie,
  subscribeHasAccountCookie,
} from "@/lib/auth-next";

function withLoginIntent(href: string, intent: string): string {
  if (!href.startsWith("/login")) return href;
  const url = new URL(href, "https://totallygonebananas.local");
  url.searchParams.set("intent", intent);
  return `${url.pathname}${url.search}`;
}

/** Homepage / marketing CTA that logs signup intent to GTM. */
export function TrackedSignupLink({
  href,
  children,
  buttonText,
  intent,
  className,
  signInLabel = "Sign in",
  markHomeJoin = false,
  hasAccount: hasAccountProp = false,
}: {
  href: string;
  children: ReactNode;
  buttonText: string;
  intent: string;
  className?: string;
  /** Shown instead of children when this browser already has an account cookie. */
  signInLabel?: string;
  /** When true, clicking suppresses the scroll engagement popup for this session. */
  markHomeJoin?: boolean;
  /** Server-known `tgb_has_account` cookie so the first paint matches. */
  hasAccount?: boolean;
}) {
  const hasAccount = useSyncExternalStore(
    subscribeHasAccountCookie,
    readHasAccountCookie,
    () => hasAccountProp,
  );

  const label = hasAccount ? signInLabel : children;
  const trackedText = hasAccount ? signInLabel : buttonText;
  const destination = hasAccount ? withLoginIntent(href, "save") : href;

  return (
    <Link
      className={className}
      href={destination}
      onClick={() => {
        trackButtonClick(trackedText, { intent: hasAccount ? "sign_in" : intent });
        trackEvent("signup_gate", { intent: hasAccount ? "sign_in" : intent });
        if (markHomeJoin) {
          try {
            sessionStorage.setItem(HOME_JOIN_INTERACTED_KEY, "1");
          } catch {
            /* ignore */
          }
        }
      }}
    >
      {label}
    </Link>
  );
}

export type TrackedSignupLinkProps = ComponentProps<typeof TrackedSignupLink>;
