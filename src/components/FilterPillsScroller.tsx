"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export function FilterPillsScroller({ children, label }: { children: ReactNode; label: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [collapsedMax, setCollapsedMax] = useState<number | undefined>(undefined);
  const panelId = useId();

  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const first = content.querySelector<HTMLElement>(".cat, .chip, .blog-topic");
    const rowHeight = first?.offsetHeight ?? 44;
    const styles = getComputedStyle(content);
    const gap = Number.parseFloat(styles.rowGap || styles.gap) || 0;
    // Include drop-shadow offset so first-row pill bottoms aren't clipped.
    const shadowPad = 6;
    const oneRow = rowHeight + shadowPad;
    setCollapsedMax(oneRow);
    setHasMore(content.scrollHeight > oneRow + gap + 2);
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, children]);

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className={`filter-pills-expand${expanded ? " is-expanded" : ""}${hasMore ? " has-more" : ""}`}>
      <div
        id={panelId}
        className="filter-pills-body"
        ref={bodyRef}
        style={!expanded && collapsedMax ? { maxHeight: collapsedMax } : undefined}
      >
        <div className="filter-pills-content" ref={contentRef}>
          {children}
        </div>
      </div>
      {hasMore && (
        <button
          type="button"
          className="filter-pills-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? `Show fewer ${label}` : `Show more ${label}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
        </button>
      )}
    </div>
  );
}
