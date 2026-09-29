"use client";

import { useState } from "react";
import { parseServingCount } from "@/lib/format";
import { scaleLine } from "@/lib/scale";
import type { IngredientGroup } from "@/lib/ingredients";

export function IngredientPanel({
  ingredients,
  servings,
}: {
  ingredients: IngredientGroup[];
  servings: string | number | null;
}) {
  const baseServings = parseServingCount(servings);
  const [serv, setServ] = useState(baseServings ?? 0);
  const [mult, setMult] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const k = baseServings ? serv / baseServings : mult;
  const groups = ingredients.length ? ingredients : [{ title: "", items: [] as string[] }];

  const toggle = (key: string) =>
    setChecked((c) => {
      const n = new Set(c);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <aside className="panel ing-panel" aria-labelledby="ing-title">
      <h2 id="ing-title">Ingredients</h2>
      <p>Tick things off as you shop or cook.</p>
      <div className="scale">
        {baseServings ? (
          <>
            <span id="serv-label">Serving size</span>
            <span className="stepper" role="group" aria-labelledby="serv-label">
              <button type="button" aria-label="Fewer servings" disabled={serv <= 1} onClick={() => setServ((s) => Math.max(1, s - 1))}>−</button>
              <output aria-live="polite">{serv}</output>
              <button type="button" aria-label="More servings" onClick={() => setServ((s) => Math.min(200, s + 1))}>+</button>
            </span>
          </>
        ) : (
          <>
            <span>Batch</span>
            {[0.5, 1, 2, 3].map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={mult === m} onClick={() => setMult(m)}>{m === 0.5 ? "½" : m}×</button>
            ))}
          </>
        )}
      </div>
      {groups.map((group, gi) => (
        <div key={gi} className="ing-group">
          {group.title ? <h3 className="ing-group-title">{group.title}</h3> : null}
          <ol className="checks">
            {group.items.map((line, i) => {
              const key = `${gi}-${i}`;
              const [q, rest] = scaleLine(line, k);
              return (
                <li key={key}>
                  <label>
                    <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} />
                    <span>{q && <b className="scaled">{q}</b>}{rest}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {checked.size > 0 && <button type="button" className="btn ghost small" onClick={() => setChecked(new Set())}>Uncheck all</button>}
    </aside>
  );
}
