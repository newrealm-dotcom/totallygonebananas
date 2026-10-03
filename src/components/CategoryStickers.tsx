import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryStickers({ categories, counts, active, hrefFor, small = false }: {
  categories: Category[]; counts?: Map<string, number>; active?: string; hrefFor: (id: string | null) => string; small?: boolean;
}) {
  const total = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : undefined;
  return (
    <nav className={`cats${small ? " small" : ""}`} aria-label="Recipe categories">
      <Link className="cat" href={hrefFor(null)} aria-current={!active ? "page" : undefined}>
        All {total !== undefined && <small>{total}</small>}
      </Link>
      {categories.map((c) => (
        <Link key={c.id} className="cat" href={hrefFor(c.id)} aria-current={active === c.id ? "page" : undefined}>
          {c.name} {counts && <small>{counts.get(c.id) ?? 0}</small>}
        </Link>
      ))}
    </nav>
  );
}
