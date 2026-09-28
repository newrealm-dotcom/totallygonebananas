"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe, reviewRecipe } from "@/actions/recipes";
import { deleteCookLog } from "@/actions/engagement";

export function DeleteRecipeButton({
  recipeId,
  afterDelete = "profile",
}: {
  recipeId: string;
  /** After a successful delete: go to My recipes, or refresh the current page. */
  afterDelete?: "profile" | "refresh";
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button type="button" className="btn danger small" disabled={pending} onClick={() => {
        if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
        start(async () => {
          const r = await deleteRecipe(recipeId);
          if (!r.ok) { setError(r.error ?? ""); return; }
          if (afterDelete === "refresh") router.refresh();
          else router.push("/profile?tab=recipes");
        });
      }}>{pending ? "Deleting…" : armed ? "Tap again to delete" : "Delete"}</button>
      {error && <span className="f-err" role="alert">{error}</span>}
    </>
  );
}

export function ReviewButtons({ recipeId }: { recipeId: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (d: "publish" | "reject") => start(async () => {
    const r = await reviewRecipe(recipeId, d, note);
    if (r.ok) { setMsg(d === "publish" ? "Published." : "Sent back to the author."); router.refresh(); } else setMsg(r.error ?? "");
  });
  return (
    <div className="stack review-tools">
      <label className="sr" htmlFor={`note-${recipeId}`}>Note to the author</label>
      <input id={`note-${recipeId}`} className="field small" placeholder="Note to the author (optional, shown if you send it back)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row-actions">
        <button type="button" className="btn small" disabled={pending} onClick={() => act("publish")}>Publish</button>
        <button type="button" className="btn ghost small" disabled={pending} onClick={() => act("reject")}>Send back</button>
      </div>
      {msg && <p className="hint" role="status">{msg}</p>}
    </div>
  );
}

export function RemoveLogButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <button type="button" className="linkbtn" disabled={pending} onClick={() => start(async () => { await deleteCookLog(id); router.refresh(); })}>Remove</button>;
}

export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="btn ghost small" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy this link:", url); }
    }}>{copied ? "Copied!" : label}</button>
  );
}
