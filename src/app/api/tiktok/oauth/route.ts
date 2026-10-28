import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getViewer, isAdminRole } from "@/lib/queries";
import { tiktokAuthorizeUrl } from "@/lib/social/tiktok";

const STATE_COOKIE = "tiktok_oauth_state";

export async function GET() {
  const base = siteUrl();
  const { profile } = await getViewer();
  if (!isAdminRole(profile)) {
    return NextResponse.redirect(new URL("/admin", base));
  }

  const state = randomBytes(16).toString("hex");
  const authorize = tiktokAuthorizeUrl(state);
  if (!authorize) {
    return NextResponse.redirect(new URL("/admin/tiktok?error=missing_app", base));
  }

  const res = NextResponse.redirect(authorize);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
