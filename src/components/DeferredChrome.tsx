"use client";

import dynamic from "next/dynamic";

/** Float + back-to-top are below-fold chrome — keep them out of the initial JS parse. */
const BackToTop = dynamic(() => import("@/components/BackToTop").then((m) => m.BackToTop), {
  ssr: false,
});
const SignupFloatButton = dynamic(
  () => import("@/components/SignupFloatButton").then((m) => m.SignupFloatButton),
  { ssr: false },
);

export function DeferredBackToTop() {
  return <BackToTop />;
}

export function DeferredSignupFloatButton() {
  return <SignupFloatButton />;
}
