"use client";

import { useState, useTransition } from "react";
import { submitPostComment } from "@/actions/comments";

export function PostCommentForm({
  postId,
  defaultName = "",
}: {
  postId: string;
  defaultName?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState(defaultName);
  const [body, setBody] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await submitPostComment({ postId, displayName, body });
      if (!result.ok) {
        setErrors(result.errors ?? { form: result.error || "Couldn't send that comment." });
        return;
      }
      setSent(true);
      setBody("");
    });
  }

  if (sent) {
    return (
      <p className="blog-comment-thanks" role="status">
        Thanks — your comment will show up after we approve it.
      </p>
    );
  }

  return (
    <form className="blog-comment-form stack" onSubmit={onSubmit} noValidate>
      <div className="f">
        <label htmlFor="post-comment-name">Name</label>
        <input
          id="post-comment-name"
          className="field"
          name="displayName"
          autoComplete="name"
          value={displayName}
          maxLength={80}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={!!errors.displayName}
          required
        />
        {errors.displayName ? <p className="f-err">{errors.displayName}</p> : null}
      </div>
      <div className="f">
        <label htmlFor="post-comment-body">Comment</label>
        <textarea
          id="post-comment-body"
          className="field"
          name="body"
          rows={4}
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={!!errors.body}
          required
        />
        {errors.body ? <p className="f-err">{errors.body}</p> : null}
      </div>
      {errors.form ? (
        <p className="f-err" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="row-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Post comment"}
        </button>
      </div>
      <p className="hint">Comments are reviewed before they appear on the post.</p>
    </form>
  );
}
