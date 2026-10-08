import { ingredientUrlError, type IngredientItem } from "@/lib/ingredients";

/** Same shape as an ingredient line: optional link opens in a new window. */
export type EquipmentItem = IngredientItem;

function normalizeEquipmentItem(raw: unknown): EquipmentItem | null {
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

/** Normalize DB/API values: legacy string[] or object items → EquipmentItem[]. */
export function normalizeEquipment(raw: unknown): EquipmentItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(normalizeEquipmentItem).filter((item): item is EquipmentItem => !!item);
}
