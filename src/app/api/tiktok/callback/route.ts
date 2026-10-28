import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getViewer, isAdminRole } from "@/lib/queries";
import { exchangeTikTokCode, queryTikTokCreator, saveTikTokConnection } from "@/lib/social/tiktok";

const STATE_COOKIE = "tiktok_oauth_state";

export async function GET(req: Request) {
  const base = siteUrl();
  const { profile } = await getViewer();
  if (!isAdminRole(profile)) {
    return NextResponse.redirect(new URL("/admin", base));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/admin/tiktok?error=${encodeURIComponent(reason)}`, base));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  if (oauthError) return fail(oauthError);
  if (!code || !state || !expected || state !== expected) return fail("oauth_state");

  try {
    const tokens = await exchangeTikTokCode(code);
    let creator: { username: string | null; nickname: string | null } = { username: null, nickname: null };
    try {
      creator = await queryTikTokCreator(tokens.accessToken);
    } catch {
      creator = { username: null, nickname: null };
    }
    await saveTikTokConnection({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      meta: {
        open_id: tokens.openId,
        username: creator.username,
        nickname: creator.nickname,
      },
    });
    const res = NextResponse.redirect(new URL("/admin/tiktok?connected=1", base));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return fail(message.slice(0, 180));
  }
}
