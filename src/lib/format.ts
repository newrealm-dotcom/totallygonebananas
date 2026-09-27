export function timeLabel(minutes: number | null, note?: string | null) {
  if (note) return note;
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} hr${m ? ` ${m} min` : ""}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recipe"
  );
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Capitalize the first letter of each word (preserves the rest of each word). */
export function titleCase(s: string) {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

const TINTS = ["#F9E798", "#F4BC9C", "#C7E7D7", "#F9D3DA", "#CEE1F3", "#DBD0F0", "#CEDFA2", "#F1D8BC"];
export function tintFor(categoryId: string | null, categories: { id: string }[]) {
  const i = Math.max(0, categories.findIndex((c) => c.id === categoryId));
  return TINTS[i % TINTS.length];
}
