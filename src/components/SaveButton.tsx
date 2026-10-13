"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSave } from "@/actions/engagement";
import { trackButtonClick, trackEvent } from "@/lib/analytics/datalayer";

export function SaveButton({
  recipeId,
  title,
  initialSaved,
  signedIn,
  className = "",
}: {
  recipeId: string;
  title: string;
  initialSaved: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const handledPendingSave = useRef(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!signedIn || handledPendingSave.current || pending) return;
    const url = new URL(location.href);
    if (url.searchParams.get("pending_save") !== recipeId) return;

    handledPendingSave.current = true;
    url.searchParams.delete("pending_save");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });

    if (saved) return;
    start(async () => {
      const res = await toggleSave(recipeId);
      if (!res.ok) return;
      setSaved(true);
      trackEvent("save_recipe", { recipe_id: recipeId });
      trackButtonClick("Save recipe", { recipe_id: recipeId });
    });
  }, [pending, recipeId, router, saved, signedIn, start]);

  function onClick() {
    if (!signedIn) {
      trackButtonClick("Save recipe (signed out)", { recipe_id: recipeId });
      trackEvent("signup_gate", { intent: "save", recipe_id: recipeId });
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set("pending_save", recipeId);
      const next = encodeURIComponent(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      router.push(`/login?next=${next}&intent=save`);
      return;
    }
    const next = !saved;
    setSaved(next);
    start(async () => {
      const res = await toggleSave(recipeId);
      if (!res.ok) {
        setSaved(!next);
        return;
      }
      trackEvent(next ? "save_recipe" : "unsave_recipe", { recipe_id: recipeId });
      if (next) trackButtonClick("Save recipe", { recipe_id: recipeId });
    });
  }

  return (
    <button
      type="button"
      className={`heart ${className}`}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Save"} ${title}`}
      onClick={onClick}
      disabled={pending}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.8 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.6 3.3 4.4 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
