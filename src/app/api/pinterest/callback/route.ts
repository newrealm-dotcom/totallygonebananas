import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getViewer, isAdminRole } from "@/lib/queries";
import {
  exchangePinterestCode,
  listPinterestBoards,
  savePinterestConnection,
} from "@/lib/social/pinterest";

const STATE_COOKIE = "pinterest_oauth_state";

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
    const res = NextResponse.redirect(new URL(`/admin/pinterest?error=${encodeURIComponent(reason)}`, base));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  if (oauthError) return fail(oauthError);
  if (!code || !state || !expected || state !== expected) return fail("oauth_state");

  try {
    const tokens = await exchangePinterestCode(code);
    const boards = await listPinterestBoards(tokens.accessToken);
    await savePinterestConnection({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      meta: { boards: boards.map((b) => ({ id: b.id, name: b.name })) },
    });
    const res = NextResponse.redirect(new URL("/admin/pinterest?connected=1", base));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return fail(message.slice(0, 120));
  }
}
