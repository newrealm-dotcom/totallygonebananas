import type { RecipeNutrition } from "@/lib/nutrition";

function Row({ label, value, unit = "g", bold }: { label: string; value: number; unit?: string; bold?: boolean }) {
  const shown = unit === "mg" || unit === "kcal" ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  return (
    <div className={`nf-row${bold ? " is-bold" : ""}`}>
      <span>{label}</span>
      <span>
        {shown}
        {unit === "kcal" ? "" : unit}
      </span>
    </div>
  );
}

export function NutritionFactsPanel({
  nutrition,
  title = "Nutrition facts",
}: {
  nutrition: RecipeNutrition;
  title?: string;
}) {
  const n = nutrition.perServing;
  return (
    <aside className="nf-panel" aria-label={title}>
      <h3 className="nf-title">{title}</h3>
      <p className="nf-serving">
        Per serving
        {nutrition.servings > 1 ? ` (${nutrition.servings} servings)` : ""}
      </p>
      <div className="nf-calories">
        <span>Calories</span>
        <strong>{n.calories}</strong>
      </div>
      <Row label="Total fat" value={n.fat} bold />
      <Row label="Saturated fat" value={n.saturatedFat} />
      <Row label="Total carbohydrate" value={n.carbs} bold />
      <Row label="Dietary fiber" value={n.fiber} />
      <Row label="Total sugars" value={n.sugar} />
      <Row label="Protein" value={n.protein} bold />
      <Row label="Sodium" value={n.sodium} unit="mg" bold />
      {nutrition.unmatched.length > 0 && (
        <p className="nf-note">
          Estimate based on {nutrition.matchedCount} matched ingredient
          {nutrition.matchedCount === 1 ? "" : "s"}. Not counted: {nutrition.unmatched.slice(0, 4).join("; ")}
          {nutrition.unmatched.length > 4 ? "…" : ""}.
        </p>
      )}
      {!nutrition.unmatched.length && (
        <p className="nf-note">Estimated from the ingredient list. Values are approximate.</p>
      )}
    </aside>
  );
}
