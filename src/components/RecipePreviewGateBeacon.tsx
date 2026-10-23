"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/datalayer";

/** Records that an anonymous visitor hit the one-recipe limit. */
export function RecipePreviewGateBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("signup_gate", { intent: "recipe", slug });
  }, [slug]);
  return null;
}
