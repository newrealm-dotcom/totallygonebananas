"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

/** Below-fold chrome — keep it out of the initial JS parse. */
const BackToTop = dynamic(() => import("@/components/BackToTop").then((m) => m.BackToTop), {
  ssr: false,
});
const ScrollEngagementPopup = dynamic(
  () => import("@/components/ScrollEngagementPopup").then((m) => m.ScrollEngagementPopup),
  { ssr: false },
);
const AuthClientEffects = dynamic(
  () => import("@/components/AuthClientEffects").then((m) => m.AuthClientEffects),
  { ssr: false },
);

export function DeferredBackToTop() {
  return <BackToTop />;
}

export function DeferredScrollEngagementPopup() {
  return <ScrollEngagementPopup />;
}

export function DeferredAuthJoinedBeacon() {
  return (
    <Suspense fallback={null}>
      <AuthClientEffects />
    </Suspense>
  );
}
