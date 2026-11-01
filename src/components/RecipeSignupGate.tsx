"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { RecipePreviewGateBeacon } from "@/components/RecipePreviewGateBeacon";

/**
 * NYT-style soft wall: locks to the bottom half of the viewport and prevents
 * scrolling past it. Cookie / one-recipe logic stays in recipe-preview.ts.
 */
export function RecipeSignupGate({
  title,
  slug,
  googleEnabled,
  hasAccount = false,
}: {
  title: string;
  slug: string;
  googleEnabled: boolean;
  hasAccount?: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    root.classList.add("recipe-signup-wall-active");
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.classList.remove("recipe-signup-wall-active");
      root.style.overflow = prevRootOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <section className="recipe-signup-wall" aria-labelledby="recipe-signup-wall-title">
      <RecipePreviewGateBeacon slug={slug} />
      <div className="recipe-signup-wall-fade" aria-hidden="true" />
      <div className="recipe-signup-wall-sheet">
        <p className="recipe-signup-wall-kicker">Enjoy unlimited banana recipes</p>
        <h2 id="recipe-signup-wall-title" className="recipe-signup-wall-title">
          Join free to keep cooking
        </h2>
        <p className="recipe-signup-wall-lede">
          Guests get one full recipe. Your free preview is used up — create a free Banana Stand to open{" "}
          <b>{title}</b> and every other recipe on the site.
        </p>
        <div className="recipe-signup-wall-form">
          <LoginForm
            next={`/recipes/${slug}`}
            googleEnabled={googleEnabled}
            intent="recipe"
            hasAccount={hasAccount}
          />
        </div>
        <p className="recipe-signup-wall-back">
          <Link href="/recipes">Back to all recipes</Link>
        </p>
      </div>
    </section>
  );
}
