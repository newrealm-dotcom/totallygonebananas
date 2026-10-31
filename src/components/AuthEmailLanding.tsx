"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Confirmation emails that still use Supabase's default link land on the site
 * URL with a token hash or an implicit session hash. Send those through the
 * app callback so the first visit opens /profile.
 */
export function AuthEmailLanding() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/auth/callback") || pathname.startsWith("/api/")) return;
    const url = new URL(window.location.href);

    if (url.searchParams.has("token_hash")) {
      const dest = new URL("/auth/callback", url.origin);
      url.searchParams.forEach((value, key) => dest.searchParams.set(key, value));
      window.location.replace(dest.toString());
      return;
    }

    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const welcome = hash.get("type") === "signup";
    void createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) return;
        window.location.replace(welcome ? "/profile?welcome=1&joined=1" : "/profile?joined=1");
      });
  }, [pathname]);

  return null;
}
