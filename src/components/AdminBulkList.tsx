"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminBulkCloneCategories,
  adminBulkClonePosts,
  adminBulkCloneRecipes,
  adminBulkDeleteCategories,
  adminBulkDeletePosts,
  adminBulkDeleteRecipes,
  adminBulkSetPostStatus,
  adminBulkSetRecipeStatus,
  adminCloneCategory,
  adminClonePost,
  adminCloneRecipe,
  adminDeleteCategory,
  adminDeletePost,
  adminDeleteRecipe,
} from "@/actions/admin";
import type { RecipeStatus } from "@/lib/types";

export interface AdminBulkItem {
  id: string;
  name: string;
  editHref: string;
  viewHref?: string;
  detail: string;
  status?: string;
  /** Optional featured/cover image shown before the title. */
  imageSrc?: string | null;
}

type Kind = "recipe" | "post" | "category";

export function AdminBulkList({
  kind,
  isAdmin,
  items,
}: {
  kind: Kind;
  isAdmin: boolean;
  items: AdminBulkItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const selectedItems = items.filter((i) => selected.has(i.id));
  const one = selectedItems.length === 1 ? selectedItems[0] : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ids));
  }

  function afterOk(clear = true) {
    if (clear) setSelected(new Set());
    router.refresh();
  }

  function deleteSelected() {
    const n = selected.size;
    if (!n) return;
    const label = kind === "recipe" ? "recipe" : kind === "post" ? "post" : "category";
    if (!confirm(`Delete ${n} ${label}${n === 1 ? "" : "s"} permanently? This can’t be undone.`)) return;
    const list = [...selected];
    startTransition(async () => {
      const result =
        kind === "recipe"
          ? await adminBulkDeleteRecipes(list)
          : kind === "post"
            ? await adminBulkDeletePosts(list)
            : await adminBulkDeleteCategories(list);
      if (!result.ok) alert(result.error);
      else afterOk();
    });
  }

  function cloneSelected() {
    const list = [...selected];
    if (!list.length) return;
    startTransition(async () => {
      if (list.length === 1) {
        const item = selectedItems[0];
        const result =
          kind === "recipe"
            ? await adminCloneRecipe(item.id)
            : kind === "post"
              ? await adminClonePost(item.id)
              : await adminCloneCategory(item.id);
        if (!result.ok) {
          alert(result.error);
          return;
        }
        setSelected(new Set());
        if (kind === "recipe" && result.slug) router.push(`/recipes/${result.slug}/edit`);
        else if (kind === "post" && result.id) router.push(`/admin/posts/${result.id}/edit`);
        router.refresh();
        return;
      }
      const result =
        kind === "recipe"
          ? await adminBulkCloneRecipes(list)
          : kind === "post"
            ? await adminBulkClonePosts(list)
            : await adminBulkCloneCategories(list);
      if (!result.ok) alert(result.error);
      else afterOk();
    });
  }

  function editSelected() {
    if (!one) {
      alert("Select exactly one item to open the editor. For several recipes or posts, use Set status.");
      return;
    }
    router.push(one.editHref);
  }

  function setStatus(status: string) {
    const list = [...selected];
    if (!list.length) return;
    startTransition(async () => {
      const result =
        kind === "recipe"
          ? await adminBulkSetRecipeStatus(list, status as RecipeStatus)
          : kind === "post" && (status === "draft" || status === "published")
            ? await adminBulkSetPostStatus(list, status)
            : { ok: false as const, error: "Invalid status." };
      if (!result.ok) alert(result.error);
      else afterOk();
    });
  }

  function rowDelete(item: AdminBulkItem) {
    if (!confirm(`Delete “${item.name}” permanently? This can’t be undone.`)) return;
    startTransition(async () => {
      const result =
        kind === "recipe"
          ? await adminDeleteRecipe(item.id)
          : kind === "post"
            ? await adminDeletePost(item.id)
            : await adminDeleteCategory(item.id);
      if (!result.ok) alert(result.error);
      else afterOk();
    });
  }

  function rowClone(item: AdminBulkItem) {
    startTransition(async () => {
      const result =
        kind === "recipe"
          ? await adminCloneRecipe(item.id)
          : kind === "post"
            ? await adminClonePost(item.id)
            : await adminCloneCategory(item.id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      if (kind === "recipe" && result.slug) router.push(`/recipes/${result.slug}/edit`);
      else if (kind === "post" && result.id) router.push(`/admin/posts/${result.id}/edit`);
      router.refresh();
    });
  }

  if (!items.length) return null;

  return (
    <div className="admin-bulk">
      {isAdmin && (
        <div className="admin-bulk-bar">
          <label className="admin-check">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pending} />
            <span>Select all</span>
          </label>
          <span className="muted">{someSelected ? `${selected.size} selected` : "Select rows for bulk actions"}</span>
          <div className="row-actions">
            <button type="button" className="btn small ghost" disabled={pending || !one} onClick={editSelected}>
              Edit
            </button>
            {(kind === "recipe" || kind === "post") && (
              <label className="admin-bulk-status">
                <span className="sr">Set status</span>
                <select
                  className="field small"
                  disabled={pending || !someSelected}
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) setStatus(v);
                  }}
                >
                  <option value="" disabled>
                    Set status…
                  </option>
                  {kind === "recipe" ? (
                    <>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="published">Published</option>
                      <option value="rejected">Rejected</option>
                    </>
                  ) : (
                    <>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </>
                  )}
                </select>
              </label>
            )}
            <button type="button" className="btn small ghost" disabled={pending || !someSelected} onClick={cloneSelected}>
              Clone
            </button>
            <button type="button" className="btn small danger" disabled={pending || !someSelected} onClick={deleteSelected}>
              Delete
            </button>
          </div>
        </div>
      )}

      <ul className="rows">
        {items.map((item) => (
          <li key={item.id} className={`row${selected.has(item.id) ? " is-selected" : ""}`}>
            {isAdmin && (
              <label className="admin-check row-check">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  disabled={pending}
                  aria-label={`Select ${item.name}`}
                />
              </label>
            )}
            <div className="admin-row-main">
              {item.imageSrc ? (
                <Link href={item.viewHref || item.editHref} className="admin-row-thumb" tabIndex={-1} aria-hidden="true">
                  <Image src={item.imageSrc} alt="" width={144} height={108} unoptimized />
                </Link>
              ) : kind === "post" ? (
                <span className="admin-row-thumb is-empty" aria-hidden="true" />
              ) : null}
              <div className="admin-row-copy">
                <h3>
                  <Link href={item.viewHref || item.editHref}>{item.name}</Link>
                </h3>
                <p>
                  {item.status ? <span className={`status s-${item.status}`}>{item.status}</span> : null}
                  {item.status ? " · " : null}
                  {item.detail}
                </p>
              </div>
            </div>
            <div className="row-actions">
              <Link className="btn small ghost" href={item.editHref}>
                Edit
              </Link>
              {item.viewHref && (
                <Link className="btn small ghost" href={item.viewHref}>
                  View
                </Link>
              )}
              {isAdmin && (
                <div className="admin-cd">
                  <button type="button" className="btn small ghost" disabled={pending} onClick={() => rowClone(item)}>
                    Clone
                  </button>
                  <button type="button" className="btn small danger" disabled={pending} onClick={() => rowDelete(item)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
