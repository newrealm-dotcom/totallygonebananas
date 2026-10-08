"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { EquipmentItem } from "@/lib/equipment";
import type { IngredientGroup } from "@/lib/ingredients";
import { RecipeFacts } from "@/components/RecipeFacts";

export interface PrintRecipePayload {
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string;
  difficulty: number | null;
  servings: string | null;
  totalMinutes: number | null;
  equipment: EquipmentItem[];
  ingredients: IngredientGroup[];
  steps: { title: string; steps: string[] }[];
}

export function PrintRecipeButton({ recipe }: { recipe: PrintRecipePayload }) {
  const [open, setOpen] = useState(false);
  const [omitImage, setOmitImage] = useState(false);
  const [omitBlurb, setOmitBlurb] = useState(false);
  const [omitFacts, setOmitFacts] = useState(false);
  const [omitEquipment, setOmitEquipment] = useState(false);
  const titleId = useId();
  const hasImage = !!recipe.imageUrl;
  const hasBlurb = !!recipe.description?.trim();
  const hasFacts =
    (typeof recipe.difficulty === "number" && recipe.difficulty >= 1 && recipe.difficulty <= 5) ||
    !!recipe.servings?.trim() ||
    (typeof recipe.totalMinutes === "number" && recipe.totalMinutes > 0);
  const equipment = recipe.equipment
    .map((item) => ({ text: item.text.trim(), url: item.url.trim() }))
    .filter((item) => item.text);
  const hasEquipment = equipment.length > 0;
  const hasOpts = hasImage || hasBlurb || hasFacts || hasEquipment;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onPrint() {
    document.documentElement.classList.add("print-preview");
    document.documentElement.classList.toggle("print-preview-no-image", omitImage || !hasImage);
    document.documentElement.classList.toggle("print-preview-no-blurb", omitBlurb || !hasBlurb);
    document.documentElement.classList.toggle("print-preview-no-facts", omitFacts || !hasFacts);
    document.documentElement.classList.toggle("print-preview-no-equipment", omitEquipment || !hasEquipment);
    const cleanup = () => {
      document.documentElement.classList.remove(
        "print-preview",
        "print-preview-no-image",
        "print-preview-no-blurb",
        "print-preview-no-facts",
        "print-preview-no-equipment",
      );
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => window.print(), 50);
  }

  const preview = open
    ? createPortal(
        <div className="print-preview-root" role="presentation">
          <div
            className="print-preview-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="print-preview-dialog">
              <div className="print-preview-chrome">
                <div className="print-preview-chrome-top">
                  <h2 id={titleId}>Print preview</h2>
                  <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
                {hasOpts && (
                  <div className="print-preview-opts" role="group" aria-label="Print options">
                    {hasImage && (
                      <label className="print-recipe-opt">
                        <input
                          type="checkbox"
                          checked={omitImage}
                          onChange={(e) => setOmitImage(e.target.checked)}
                        />
                        <span>Remove image</span>
                      </label>
                    )}
                    {hasBlurb && (
                      <label className="print-recipe-opt">
                        <input
                          type="checkbox"
                          checked={omitBlurb}
                          onChange={(e) => setOmitBlurb(e.target.checked)}
                        />
                        <span>Remove blurb</span>
                      </label>
                    )}
                    {hasFacts && (
                      <label className="print-recipe-opt">
                        <input
                          type="checkbox"
                          checked={omitFacts}
                          onChange={(e) => setOmitFacts(e.target.checked)}
                        />
                        <span>Remove details</span>
                      </label>
                    )}
                    {hasEquipment && (
                      <label className="print-recipe-opt">
                        <input
                          type="checkbox"
                          checked={omitEquipment}
                          onChange={(e) => setOmitEquipment(e.target.checked)}
                        />
                        <span>Remove equipment</span>
                      </label>
                    )}
                  </div>
                )}
                <div className="print-preview-actions">
                  <button type="button" className="btn" onClick={onPrint}>
                    Print
                  </button>
                </div>
              </div>

              <div className="print-preview-sheet">
                {hasImage && !omitImage && recipe.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- print preview uses a simple img for reliable printing
                  <img
                    className="print-preview-image"
                    src={recipe.imageUrl}
                    alt={recipe.imageAlt}
                  />
                )}
                <h1 className="print-preview-title">{recipe.title}</h1>
                {hasFacts && !omitFacts && (
                  <div className="print-preview-facts">
                    <RecipeFacts
                      difficulty={recipe.difficulty}
                      servings={recipe.servings}
                      totalMinutes={recipe.totalMinutes}
                    />
                  </div>
                )}
                {hasBlurb && !omitBlurb && recipe.description && (
                  <p className="print-preview-blurb">{recipe.description}</p>
                )}

                {hasEquipment && !omitEquipment && (
                  <section className="print-preview-section print-preview-equipment-sec" aria-labelledby="print-equip-title">
                    <h2 id="print-equip-title">Equipment</h2>
                    <ol className="print-preview-equipment">
                      {equipment.map((item, i) => (
                        <li key={i}>
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer">{item.text}</a>
                          ) : (
                            item.text
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <section className="print-preview-section" aria-labelledby="print-ing-title">
                  <h2 id="print-ing-title">Ingredients</h2>
                  {recipe.ingredients.map((group, gi) => (
                    <div key={gi} className="print-preview-group">
                      {group.title ? <h3>{group.title}</h3> : null}
                      <ul>
                        {group.items.map((item, i) => (
                          <li key={i}>
                            {item.url ? (
                              <a href={item.url} target="_blank" rel="noopener noreferrer">{item.text}</a>
                            ) : (
                              item.text
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>

                <section className="print-preview-section" aria-labelledby="print-steps-title">
                  <h2 id="print-steps-title">Steps</h2>
                  {recipe.steps.map((group, gi) => (
                    <div key={gi} className="print-preview-group">
                      {group.title ? <h3>{group.title}</h3> : null}
                      <ol>
                        {group.steps.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Print recipe
      </button>
      {preview}
    </>
  );
}
