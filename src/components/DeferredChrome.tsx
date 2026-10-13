"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

/** Float + back-to-top are below-fold chrome — keep them out of the initial JS parse. */
const BackToTop = dynamic(() => import("@/components/BackToTop").then((m) => m.BackToTop), {
  ssr: false,
});
const SignupFloatButton = dynamic(
  () => import("@/components/SignupFloatButton").then((m) => m.SignupFloatButton),
  { ssr: false },
);
const NewsletterPopup = dynamic(
  () => import("@/components/NewsletterPopup").then((m) => m.NewsletterPopup),
  { ssr: false },
);
const AuthJoinedBeacon = dynamic(
  () => import("@/components/AuthJoinedBeacon").then((m) => m.AuthJoinedBeacon),
  { ssr: false },
);

export function DeferredBackToTop() {
  return <BackToTop />;
}

export function DeferredSignupFloatButton() {
  return <SignupFloatButton />;
}

export function DeferredNewsletterPopup() {
  return <NewsletterPopup />;
}

export function DeferredAuthJoinedBeacon() {
  return (
    <Suspense fallback={null}>
      <AuthJoinedBeacon />
    </Suspense>
  );
}
