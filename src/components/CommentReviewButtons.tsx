"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPostComment } from "@/actions/comments";

export function CommentReviewButtons({ commentId }: { commentId: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function act(decision: "approve" | "deny") {
    start(async () => {
      const result = await reviewPostComment(commentId, decision);
      if (result.ok) {
        setMsg(decision === "approve" ? "Approved." : "Denied.");
        router.refresh();
      } else {
        setMsg(result.error);
      }
    });
  }

  return (
    <div className="stack">
      <div className="row-actions">
        <button type="button" className="btn small" disabled={pending} onClick={() => act("approve")}>
          Approve
        </button>
        <button type="button" className="btn ghost small" disabled={pending} onClick={() => act("deny")}>
          Deny
        </button>
      </div>
      {msg ? <p className="hint" role="status">{msg}</p> : null}
    </div>
  );
}
