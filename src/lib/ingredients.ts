/** A titled (or untitled) list of ingredient lines on a recipe. */
export interface IngredientGroup {
  title: string;
  items: string[];
}

/** Normalize DB/API values: legacy string[] or group objects → IngredientGroup[]. */
export function normalizeIngredientGroups(raw: unknown): IngredientGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ title: "", items: [] }];
  }
  if (typeof raw[0] === "string") {
    return [{ title: "", items: (raw as unknown[]).map((v) => String(v)).filter(Boolean) }];
  }
  const groups: IngredientGroup[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as { title?: unknown; items?: unknown };
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const items = Array.isArray(obj.items)
      ? obj.items.map((v) => String(v).trim()).filter(Boolean)
      : [];
    groups.push({ title, items });
  }
  return groups.length ? groups : [{ title: "", items: [] }];
}

export function flattenIngredientItems(groups: IngredientGroup[]): string[] {
  return groups.flatMap((g) => g.items);
}

export function countIngredients(groups: IngredientGroup[]): number {
  return flattenIngredientItems(groups).length;
}
