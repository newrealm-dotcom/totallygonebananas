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

    // Best Practices: cross-origin target=_blank needs noopener/noreferrer.
    for (const a of Array.from(root.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))) {
      const rel = new Set((a.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      a.setAttribute("rel", Array.from(rel).join(" "));
    }
  }, [html]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
