"use client";

import { AuthEmailLanding } from "@/components/AuthEmailLanding";
import { AuthJoinedBeacon } from "@/components/AuthJoinedBeacon";

/** Client-only auth follow-ups: finish a confirmation link, then record the join. */
export function AuthClientEffects() {
  return (
    <>
      <AuthEmailLanding />
      <AuthJoinedBeacon />
    </>
  );
}
