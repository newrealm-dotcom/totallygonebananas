"use client";

import { useEffect, useState } from "react";
import { scaleLine } from "@/lib/scale";

/** Scales the leading quantity of a server-rendered ingredient line in the browser. */
export function IngredientQty({ text }: { text: string }) {
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    function onScale(e: Event) {
      const detail = (e as CustomEvent<{ factor: number }>).detail;
      if (detail && typeof detail.factor === "number") setFactor(detail.factor);
    }
    document.addEventListener("tgb:ingredient-scale", onScale);
    return () => document.removeEventListener("tgb:ingredient-scale", onScale);
  }, []);

  const [q, rest] = scaleLine(text, factor);
  return (
    <span>
      {q ? <b className="scaled">{q}</b> : null}
      {rest}
    </span>
  );
}
