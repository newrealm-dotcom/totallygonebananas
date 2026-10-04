export const LEVELS = [
  { min: 0, name: "Green Rookie" },
  { min: 2_000, name: "Ripe Regular" },
  { min: 5_000, name: "Peel Pro" },
  { min: 10_000, name: "Bread Boss" },
  { min: 20_000, name: "Top Banana" },
] as const;

export function pointsFromCounts(counts: { saved: number; made: number; published: number }): number {
  return counts.saved * 3 + counts.made * 8 + counts.published * 15;
}

export function standingsFor(points: number): { points: number; level: number; name: string; next: (typeof LEVELS)[number] | undefined } {
  const level = LEVELS.reduce((a, l, i) => (points >= l.min ? i : a), 0);
  return { points, level, name: LEVELS[level].name, next: LEVELS[level + 1] };
}

/** Meter fill color for progress within the current level (scaled to a 0–20 band). */
export function meterTone(points: number, levelMin: number, nextMin?: number): "brown" | "green" | "yellow" {
  const span = nextMin != null ? Math.max(1, nextMin - levelMin) : 20;
  const into = Math.min(span, Math.max(0, points - levelMin));
  const scaled = (into / span) * 20;
  if (scaled <= 5) return "brown";
  if (scaled <= 15) return "green";
  return "yellow";
}
