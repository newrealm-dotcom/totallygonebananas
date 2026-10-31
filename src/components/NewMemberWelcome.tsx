"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function NewMemberWelcome({
  needsName,
  returnTo,
  tab = "saved",
}: {
  needsName: boolean;
  returnTo: string | null;
  tab?: "saved" | "recipes" | "made";
}) {
  const router = useRouter();

  function dismiss() {
    router.replace(tab === "saved" ? "/profile" : `/profile?tab=${tab}`, { scroll: false });
  }

  return (
    <section className="panel stack welcome-stand" aria-labelledby="welcome-heading">
      <p className="welcome-kicker">Email confirmed</p>
      <h2 id="welcome-heading">You&apos;re in. This is your Banana Stand.</h2>
      <p>Your account is ready. Pick a first step — each one takes about a minute.</p>
      <ol className="welcome-steps">
        <li>
          {needsName ? (
            <Link href="/profile/settings">Name your stand</Link>
          ) : (
            <span>Your name is set</span>
          )}
        </li>
        <li>
          <Link href="/recipes">Save a recipe</Link>
          <span>Tap the heart on any recipe and it stays here.</span>
        </li>
        <li>
          <Link href="/recipes/new">Share a recipe</Link>
          <span>Post one of yours for the bunch.</span>
        </li>
      </ol>
      <div className="row-actions">
        {returnTo ? (
          <Link className="btn" href={returnTo}>
            Back to what you were reading
          </Link>
        ) : (
          <Link className="btn" href="/recipes">
            Browse recipes
          </Link>
        )}
        <button type="button" className="btn ghost" onClick={dismiss}>
          I&apos;ll look around
        </button>
      </div>
    </section>
  );
}
