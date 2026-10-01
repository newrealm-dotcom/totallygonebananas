"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipeTag, saveRecipeTag } from "@/actions/tags";
import type { AdminRecipeTag } from "@/lib/types";

export function TagAdmin({ tags }: { tags: AdminRecipeTag[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveRecipeTag({ name, sortOrder: tags.length });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function remove(tag: AdminRecipeTag) {
    const where =
      tag.recipeCount > 0
        ? ` It is on ${tag.recipeCount} recipe${tag.recipeCount === 1 ? "" : "s"} and will be removed from ${tag.recipeCount === 1 ? "it" : "them"}.`
        : "";
    if (!confirm(`Remove “${tag.name}”?${where}`)) return;
    startTransition(async () => {
      const result = await deleteRecipeTag(tag.name);
      if (!result.ok) setErrors({ form: result.error });
      else {
        setErrors({});
        router.refresh();
      }
    });
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>Active tags</h2>
        {tags.length === 0 ? (
          <p className="muted">No active tags yet. Add one below.</p>
        ) : (
          <ul className="admin-tag-pills" aria-label="Active tags">
            {tags.map((t) => (
              <li key={t.name}>
                <span className="admin-tag-pill">
                  <span className="admin-tag-pill-label">{t.name}</span>
                  {t.recipeCount > 0 && (
                    <span className="admin-tag-pill-count" title={`Used on ${t.recipeCount} recipe${t.recipeCount === 1 ? "" : "s"}`}>
                      {t.recipeCount}
                    </span>
                  )}
                  <button
                    type="button"
                    className="admin-tag-pill-remove"
                    disabled={pending}
                    onClick={() => remove(t)}
                    aria-label={`Remove ${t.name}`}
                    title={`Remove ${t.name}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {errors.form && !name && <p className="f-err" role="alert">{errors.form}</p>}
      </div>

      <form className="panel stack" onSubmit={create}>
        <h2>Add a tag</h2>
        <div className="f">
          <label htmlFor="tag-name">Tag</label>
          <input
            id="tag-name"
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name || errors.form) setErrors({});
            }}
            required
            maxLength={24}
            placeholder="e.g. high-protein"
            aria-invalid={!!(errors.name || errors.form)}
          />
        </div>
        <p className="hint">Letters, numbers, spaces, or hyphens. No profanity or nonsense.</p>
        {(errors.form || errors.name) && (
          <p className="f-err" role="alert">{errors.form || errors.name}</p>
        )}
        <button className="btn small" type="submit" disabled={pending || !name.trim()}>
          Add tag
        </button>
      </form>
    </div>
  );
}
