/** One ingredient line. `url` is empty unless the cook should open a link. */
export interface IngredientItem {
  text: string;
  url: string;
}

/** A titled (or untitled) list of ingredient lines on a recipe. */
export interface IngredientGroup {
  title: string;
  items: IngredientItem[];
}

const HTTP_URL = /^https?:\/\/.+/i;

/** Empty when the value is blank. A message when it is not a full http(s) link. */
export function ingredientUrlError(url: string, label = "ingredient"): string | null {
  const s = url.trim();
  if (!s) return null;
  if (s.length > 500) return `Keep the ${label} link under 500 characters`;
  if (!HTTP_URL.test(s)) return "Use a full http:// or https:// link";
  return null;
}

function normalizeIngredientItem(raw: unknown): IngredientItem | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { text, url: "" } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { text?: unknown; url?: unknown };
  const text = typeof obj.text === "string" ? obj.text.trim() : "";
  if (!text) return null;
  const urlRaw = typeof obj.url === "string" ? obj.url.trim() : "";
  return { text, url: ingredientUrlError(urlRaw) ? "" : urlRaw };
}

/** Normalize DB/API values: legacy string[] or group objects → IngredientGroup[]. */
export function normalizeIngredientGroups(raw: unknown): IngredientGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ title: "", items: [] }];
  }
  if (typeof raw[0] === "string") {
    const items = (raw as unknown[]).map(normalizeIngredientItem).filter((item): item is IngredientItem => !!item);
    return [{ title: "", items }];
  }
  const groups: IngredientGroup[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as { title?: unknown; items?: unknown };
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const items = Array.isArray(obj.items)
      ? obj.items.map(normalizeIngredientItem).filter((item): item is IngredientItem => !!item)
      : [];
    groups.push({ title, items });
  }
  return groups.length ? groups : [{ title: "", items: [] }];
}

export function flattenIngredientItems(groups: IngredientGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((item) => item.text));
}

export function countIngredients(groups: IngredientGroup[]): number {
  return flattenIngredientItems(groups).length;
}
