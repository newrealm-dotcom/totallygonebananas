"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackEvent, trackFormFill } from "@/lib/analytics/datalayer";

const FLAG = "joined";

/** Fires once after magic-link / OAuth / OTP lands with `?joined=1`, then strips the param. */
export function AuthJoinedBeacon() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get(FLAG) !== "1") return;

    trackEvent("login_complete", { method: "auth_redirect" });
    trackFormFill("member_signup", { method: "auth_redirect" });

    const next = new URLSearchParams(searchParams.toString());
    next.delete(FLAG);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
