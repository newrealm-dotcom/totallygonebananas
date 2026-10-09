"use client";

import { useEffect, useId, useState } from "react";

/**
 * Serving / batch controls. Dispatches `tgb:ingredient-scale` so the server-rendered
 * ingredient lines can update quantities in the browser without owning the list markup.
 */
export function IngredientScaleControls({
  baseServings,
}: {
  baseServings: number | null;
}) {
  const labelId = useId();
  const [serv, setServ] = useState(baseServings ?? 0);
  const [mult, setMult] = useState(1);
  const factor = baseServings ? serv / baseServings : mult;

  useEffect(() => {
    document.dispatchEvent(new CustomEvent("tgb:ingredient-scale", { detail: { factor } }));
  }, [factor]);

  if (baseServings) {
    return (
      <div className="scale">
        <span id={labelId}>Serving size</span>
        <span className="stepper" role="group" aria-labelledby={labelId}>
          <button
            type="button"
            aria-label="Fewer servings"
            disabled={serv <= 1}
            onClick={() => setServ((s) => Math.max(1, s - 1))}
          >
            −
          </button>
          <output aria-live="polite">{serv}</output>
          <button
            type="button"
            aria-label="More servings"
            onClick={() => setServ((s) => Math.min(200, s + 1))}
          >
            +
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="scale">
      <span>Batch</span>
      {[0.5, 1, 2, 3].map((m) => (
        <button
          key={m}
          type="button"
          className="chip"
          aria-pressed={mult === m}
          onClick={() => setMult(m)}
        >
          {m === 0.5 ? "½" : m}×
        </button>
      ))}
    </div>
  );
}
