"use client";

import { useEffect, useRef } from "react";

/**
 * Renders trusted HTML (from editor/admin content) and re-inserts `<script>`
 * tags so they execute — browsers ignore scripts set via innerHTML.
 */
export function HtmlWithScripts({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    for (const old of Array.from(root.querySelectorAll("script"))) {
      const next = document.createElement("script");
      for (const { name, value } of Array.from(old.attributes)) {
        next.setAttribute(name, value);
      }
      next.textContent = old.textContent;
      old.replaceWith(next);
    }
  }, [html]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
