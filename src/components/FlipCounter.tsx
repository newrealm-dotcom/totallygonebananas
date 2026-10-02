"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function FlipDigit({ digit }: { digit: string }) {
  const [display, setDisplay] = useState(digit);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [prevDigit, setPrevDigit] = useState(digit);

  if (digit !== prevDigit) {
    setPrevDigit(digit);
    if (prefersReducedMotion()) {
      setDisplay(digit);
      setOutgoing(null);
    } else {
      setOutgoing(display);
      setDisplay(digit);
    }
  }

  return (
    <span className={`flip-digit${outgoing != null ? " is-flipping" : ""}`}>
      <span className="flip-digit-half flip-digit-top">
        <span className="flip-digit-num">{display}</span>
      </span>
      <span className="flip-digit-half flip-digit-bottom">
        <span className="flip-digit-num">{outgoing ?? display}</span>
      </span>
      {outgoing != null ? (
        <span
          className="flip-digit-leaf"
          onAnimationEnd={(e) => {
            if (e.animationName !== "flip-digit-bottom") return;
            setOutgoing(null);
          }}
        >
          <span className="flip-digit-leaf-front">
            <span className="flip-digit-half flip-digit-top">
              <span className="flip-digit-num">{outgoing}</span>
            </span>
          </span>
          <span className="flip-digit-leaf-back">
            <span className="flip-digit-half flip-digit-bottom">
              <span className="flip-digit-num">{display}</span>
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** Split-flap digits. Flips when `value` changes; optional `persistKey` remembers the last value in sessionStorage so revisits animate increases. */
export function FlipCounter({
  value,
  className = "",
  persistKey,
}: {
  value: number;
  className?: string;
  persistKey?: string;
}) {
  const target = Math.max(0, Math.floor(value));
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    if (!persistKey) return;

    let from = target;
    try {
      const raw = sessionStorage.getItem(persistKey);
      const prev = raw != null ? Number(raw) : NaN;
      sessionStorage.setItem(persistKey, String(target));
      if (Number.isFinite(prev) && prev !== target) from = prev;
    } catch {
      /* private mode / blocked storage */
    }

    let cancelled = false;
    let finishId = 0;
    const startId = requestAnimationFrame(() => {
      if (cancelled) return;
      if (from === target) {
        setCurrent(target);
        return;
      }
      setCurrent(from);
      finishId = requestAnimationFrame(() => {
        if (!cancelled) setCurrent(target);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(startId);
      cancelAnimationFrame(finishId);
    };
  }, [target, persistKey]);

  const digits = String(persistKey ? current : target).split("");

  return (
    <span className={`flip-counter${className ? ` ${className}` : ""}`} aria-hidden="true">
      {digits.map((d, i) => (
        <FlipDigit key={digits.length - 1 - i} digit={d} />
      ))}
    </span>
  );
}
