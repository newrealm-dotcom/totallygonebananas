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
  sway: number;
  startY: number;
  r0: number;
  r1: number;
  rMid: number;
  ease: string;
}

const EASINGS = [
  "cubic-bezier(.22, .61, .36, 1)",
  "cubic-bezier(.37, 0, .63, 1)",
  "cubic-bezier(.45, .05, .55, .95)",
  "cubic-bezier(.25, .46, .45, .94)",
  "linear",
];

function makePieces(count: number): BananaPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: -8 + Math.random() * 116,
    size: 12 + Math.random() * 38,
    // Stagger so pieces enter from above at different times.
    delay: Math.random() * 3.2,
    dur: 2.2 + Math.random() * 3.4,
    drift: (Math.random() - 0.5) * 260,
    sway: (Math.random() - 0.5) * 90,
    // Fully above the viewport (vh); CSS fill-mode keeps this applied during delay.
    startY: -(105 + Math.random() * 95),
    r0: Math.random() * 360,
    rMid: Math.random() * 720 - 360,
    r1: Math.random() * 1080 - 540,
    ease: EASINGS[Math.floor(Math.random() * EASINGS.length)],
  }));
}

const emptySubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function BananaRain({ active }: { active: boolean }) {
  const isClient = useSyncExternalStore(emptySubscribe, getClient, getServer);
  const [pieces] = useState(() => makePieces(60));
  const [done, setDone] = useState(false);

  const reducedMotion =
    isClient && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!active || !isClient || reducedMotion) return;
    const maxFall = Math.max(...pieces.map((p) => p.delay + p.dur));
    const doneTimer = window.setTimeout(() => setDone(true), (maxFall + 0.4) * 1000);
    return () => window.clearTimeout(doneTimer);
  }, [active, isClient, reducedMotion, pieces]);

  if (!active || !isClient || reducedMotion || done) return null;

  return createPortal(
    <div className="banana-rain" aria-hidden="true">
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
              "--sway": `${p.sway}px`,
              "--startY": `${p.startY}vh`,
              "--r0": `${p.r0}deg`,
              "--rMid": `${p.rMid}deg`,
              "--r1": `${p.r1}deg`,
              "--ease": p.ease,
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
