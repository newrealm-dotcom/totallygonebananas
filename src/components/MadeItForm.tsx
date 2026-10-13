"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logCook } from "@/actions/engagement";
import { trackButtonClick, trackEvent, trackFormFill } from "@/lib/analytics/datalayer";

export function MadeItForm({ recipeId, signedIn, slug }: { recipeId: string; signedIn: boolean; slug: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tip, setTip] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <div className="panel">
        <h2>Made It?</h2>
        <p>
          Create a free account to rate this recipe, share a tip, and keep track of what you&apos;ve
          cooked in your Banana Stand.
        </p>
        <Link
          className="btn"
          href={`/login?next=${encodeURIComponent(`/recipes/${slug}#made`)}&intent=rate`}
          onClick={() => {
            trackButtonClick("Sign in to rate", { recipe_id: recipeId });
            trackEvent("signup_gate", { intent: "rate", recipe_id: recipeId });
          }}
        >
          Create free account to rate
        </Link>
      </div>
    );
  }

  return (
    <form
      className="panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) {
          setMsg({ ok: false, text: "Pick a rating from 1 to 5 bananas." });
          return;
        }
        start(async () => {
          const res = await logCook({ recipeId, rating, tip });
          if (res.ok) {
            setMsg({ ok: true, text: "Nice work! Your rating is shared with everyone." });
            setRating(0);
            setTip("");
            trackEvent("cook_log", { recipe_id: recipeId, rating });
            trackFormFill("cook_log", { recipe_id: recipeId });
            trackButtonClick("I made it!", { recipe_id: recipeId });
          } else {
            setMsg({
              ok: false,
              text: res.error === "signin" ? "Please sign in again." : (res.error ?? "Something went wrong."),
            });
          }
        });
      }}
    >
      <h2>Made It?</h2>
      <p>Rate it and share a tip for the next cook.</p>
      <fieldset className="rate-row" onMouseLeave={() => setHover(0)}>
        <legend>How did it turn out?</legend>
        {[1, 2, 3, 4, 5].map((k) => (
          <span key={k}>
            <input
              type="radio"
              id={`rate-${k}`}
              name="rating"
              value={k}
              checked={rating === k}
              onChange={() => setRating(k)}
            />
            <label
              htmlFor={`rate-${k}`}
              className={k <= (hover || rating) ? "on" : undefined}
              onMouseEnter={() => setHover(k)}
              aria-label={`${k} out of 5`}
            >
              🍌
            </label>
          </span>
        ))}
      </fieldset>
      <label htmlFor="tip" className="sr">
        Tip
      </label>
      <textarea
        id="tip"
        className="field"
        rows={3}
        maxLength={280}
        placeholder="Any tips for the next cook? (optional)"
        value={tip}
        onChange={(e) => setTip(e.target.value)}
      />
      {msg && (
        <p className={msg.ok ? "ok-msg" : "f-err"} role="status">
          {msg.text}
        </p>
      )}
      <div className="row-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "I made it!"}
        </button>
      </div>
    </form>
  );
}
