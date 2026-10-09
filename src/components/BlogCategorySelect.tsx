"use client";

import { useRouter } from "next/navigation";

export function BlogCategorySelect({
  categories,
  value,
}: {
  categories: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();

  return (
    <div className="f blog-category-mobile">
      <label htmlFor="blog-category">Category</label>
      <select
        id="blog-category"
        className="field filters-sort"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          router.push(next ? `/blog?category=${encodeURIComponent(next)}` : "/blog");
        }}
      >
        <option value="">Choose A Category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
