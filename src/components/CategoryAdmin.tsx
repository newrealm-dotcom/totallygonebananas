"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCategory } from "@/actions/categories";
import {
  adminBulkCloneCategories,
  adminBulkDeleteCategories,
  adminCloneCategory,
  adminDeleteCategory,
} from "@/actions/admin";
import type { Category } from "@/lib/types";

export function CategoryAdmin({ categories, isAdmin }: { categories: Category[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(categories.length);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const oneId = selected.size === 1 ? [...selected][0] : null;

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

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveCategory({ name, sortOrder });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setName("");
      setSortOrder((n) => n + 1);
      router.refresh();
    });
  }

  function update(cat: Category, patch: Partial<{ name: string; sortOrder: number }>) {
    startTransition(async () => {
      const result = await saveCategory(
        {
          name: patch.name ?? cat.name,
          emoji: cat.emoji ?? "🍌",
          tagline: cat.tagline ?? "",
          sortOrder: patch.sortOrder ?? cat.sort_order,
        },
        cat.id,
      );
      if (!result.ok) setErrors({ ...result.errors, form: Object.values(result.errors)[0] });
      else router.refresh();
    });
  }

  function deleteSelected() {
    const n = selected.size;
    if (!n) return;
    if (!confirm(`Delete ${n} categor${n === 1 ? "y" : "ies"} permanently? Recipes keep their content but lose the link.`)) return;
    const list = [...selected];
    startTransition(async () => {
      const result = await adminBulkDeleteCategories(list);
      if (!result.ok) setErrors({ form: result.error });
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function cloneSelected() {
    const list = [...selected];
    if (!list.length) return;
    startTransition(async () => {
      const result = list.length === 1 ? await adminCloneCategory(list[0]) : await adminBulkCloneCategories(list);
      if (!result.ok) setErrors({ form: result.error });
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function editSelected() {
    if (!oneId) {
      alert("Select exactly one category to focus it for editing.");
      return;
    }
    const el = document.getElementById(`cat-name-${oneId}`);
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function rowDelete(cat: Category) {
    if (!confirm(`Delete “${cat.name}” permanently?`)) return;
    startTransition(async () => {
      const result = await adminDeleteCategory(cat.id);
      if (!result.ok) setErrors({ form: result.error });
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function rowClone(cat: Category) {
    startTransition(async () => {
      const result = await adminCloneCategory(cat.id);
      if (!result.ok) setErrors({ form: result.error });
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2>Add a category</h2>
        <div className="f-grid">
          <div className="f">
            <label htmlFor="cat-name">Name</label>
            <input id="cat-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="f">
            <label htmlFor="cat-sort">Sort order</label>
            <input id="cat-sort" className="field" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
        </div>
        {errors.form && <p className="f-err">{errors.form}</p>}
        {errors.name && <p className="f-err">{errors.name}</p>}
        <button className="btn small" type="submit" disabled={pending}>Add category</button>
      </form>

      {isAdmin && categories.length > 0 && (
        <div className="admin-bulk-bar">
          <label className="admin-check">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pending} />
            <span>Select all</span>
          </label>
          <span className="muted">{someSelected ? `${selected.size} selected` : "Select rows for bulk actions"}</span>
          <div className="row-actions">
            <button type="button" className="btn small ghost" disabled={pending || !oneId} onClick={editSelected}>
              Edit
            </button>
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
        {categories.map((c) => (
          <li key={c.id} className={`row${selected.has(c.id) ? " is-selected" : ""}`}>
            {isAdmin && (
              <label className="admin-check row-check">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  disabled={pending}
                  aria-label={`Select ${c.name}`}
                />
              </label>
            )}
            <div className="admin-cat-edit">
              <input
                id={`cat-name-${c.id}`}
                className="field small"
                aria-label={`${c.name} name`}
                defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && update(c, { name: e.target.value })}
              />
              <input className="field small" type="number" aria-label={`${c.name} sort`} defaultValue={c.sort_order} onBlur={(e) => Number(e.target.value) !== c.sort_order && update(c, { sortOrder: Number(e.target.value) })} />
              <code className="muted">{c.id}</code>
            </div>
            {isAdmin && (
              <div className="admin-cd">
                <button type="button" className="btn small ghost" disabled={pending} onClick={() => rowClone(c)}>
                  Clone
                </button>
                <button type="button" className="btn small danger" disabled={pending} onClick={() => rowDelete(c)}>
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
