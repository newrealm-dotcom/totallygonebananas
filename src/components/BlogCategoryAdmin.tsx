"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBlogCategory, saveBlogCategory } from "@/actions/blog-categories";
import type { BlogCategory } from "@/lib/types";

export function BlogCategoryAdmin({ categories }: { categories: BlogCategory[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(categories.length);

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveBlogCategory({ name, sortOrder });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setName("");
      setSortOrder((n) => n + 1);
      router.refresh();
    });
  }

  function update(cat: BlogCategory, patch: Partial<{ name: string; sortOrder: number }>) {
    startTransition(async () => {
      const result = await saveBlogCategory(
        {
          name: patch.name ?? cat.name,
          sortOrder: patch.sortOrder ?? cat.sort_order,
        },
        cat.id,
      );
      if (!result.ok) setErrors({ ...result.errors, form: Object.values(result.errors)[0] });
      else router.refresh();
    });
  }

  function remove(cat: BlogCategory) {
    if (!confirm(`Delete “${cat.name}”? Posts keep their content but lose this category.`)) return;
    startTransition(async () => {
      const result = await deleteBlogCategory(cat.id);
      if (!result.ok) setErrors({ form: result.error });
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2>Add a blog category</h2>
        <div className="f-grid">
          <div className="f">
            <label htmlFor="blog-cat-name">Name</label>
            <input id="blog-cat-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
          </div>
          <div className="f">
            <label htmlFor="blog-cat-sort">Sort order</label>
            <input
              id="blog-cat-sort"
              className="field"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        </div>
        {errors.form && <p className="f-err">{errors.form}</p>}
        {errors.name && <p className="f-err">{errors.name}</p>}
        <button className="btn small" type="submit" disabled={pending}>Add blog category</button>
      </form>

      <ul className="rows">
        {categories.length === 0 ? (
          <li className="empty"><p>No blog categories yet. Add one above, or create one while writing a post.</p></li>
        ) : (
          categories.map((c) => (
            <li key={c.id} className="row">
              <div className="admin-cat-edit" style={{ gridTemplateColumns: "1fr 6rem auto" }}>
                <input
                  className="field small"
                  aria-label={`${c.name} name`}
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value !== c.name && update(c, { name: e.target.value })}
                />
                <input
                  className="field small"
                  type="number"
                  aria-label={`${c.name} sort`}
                  defaultValue={c.sort_order}
                  onBlur={(e) => Number(e.target.value) !== c.sort_order && update(c, { sortOrder: Number(e.target.value) })}
                />
                <code className="muted">{c.id}</code>
              </div>
              <div className="admin-cd">
                <button type="button" className="btn small danger" disabled={pending} onClick={() => remove(c)}>
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
