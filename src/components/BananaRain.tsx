"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";

interface BananaPiece {
  id: number;
  x: number;
  size: number;
  delay: number;
  dur: number;
  drift: number;
  r0: number;
  r1: number;
  land: number;
}

function makePieces(count: number): BananaPiece[] {
  const out: BananaPiece[] = [];
  let seed = 0x9e3779b9;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      x: next() * 100,
      size: 16 + next() * 26,
      delay: next() * 1.6,
      dur: 2.1 + next() * 2.4,
      drift: (next() - 0.5) * 90,
      r0: next() * 360,
      r1: next() * 700 - 350,
      land: next() * 28,
    });
  }
  return out;
}

const emptySubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function BananaRain({ active }: { active: boolean }) {
  const isClient = useSyncExternalStore(emptySubscribe, getClient, getServer);
  const [pieces] = useState(() => makePieces(52));
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  const reducedMotion =
    isClient && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!active || !isClient || reducedMotion) return;
    const maxFall = Math.max(...pieces.map((p) => p.delay + p.dur));
    const fadeTimer = window.setTimeout(() => setFading(true), (maxFall + 1.2) * 1000);
    const doneTimer = window.setTimeout(() => setDone(true), (maxFall + 2.6) * 1000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, isClient, reducedMotion, pieces]);

  if (!active || !isClient || reducedMotion || done) return null;

  return createPortal(
    <div className={`banana-rain${fading ? " is-fading" : ""}`} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="banana-rain-piece"
          style={
            {
              "--x": `${p.x}vw`,
              "--size": `${p.size}px`,
              "--delay": `${p.delay}s`,
              "--dur": `${p.dur}s`,
              "--drift": `${p.drift}px`,
              "--r0": `${p.r0}deg`,
              "--r1": `${p.r1}deg`,
              "--land": `${p.land}px`,
            } as CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative rain particle */}
          <img src="/upload-complete.png" alt="" width={p.size} height={p.size} draggable={false} />
        </span>
      ))}
    </div>,
    document.body,
  );
}
