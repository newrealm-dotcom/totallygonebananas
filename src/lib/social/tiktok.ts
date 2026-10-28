import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

const API = "https://open.tiktokapis.com";
const AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const SCOPES = ["user.info.basic", "video.publish"].join(",");

const PRIVACY_PREFERENCE = ["PUBLIC_TO_EVERYONE", "FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"] as const;

const STATUS_ATTEMPTS = 8;
const STATUS_MS = 2500;

export interface TikTokConfig {
  accessToken: string;
  refreshToken: string | null;
  clientKey: string | null;
  clientSecret: string | null;
}

export interface TikTokCreator {
  username: string | null;
  nickname: string | null;
  privacyLevelOptions: string[];
}

interface TikTokConnectionRow {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  meta: Record<string, unknown> | null;
}

interface TikTokErrorBody {
  error?: string | { code?: string; message?: string };
  error_description?: string;
  message?: string;
}

export function tiktokAppCredentials(): { clientKey: string; clientSecret: string } | null {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) return null;
  return { clientKey, clientSecret };
}

export function tiktokRedirectUri(): string {
  return `${siteUrl()}/api/tiktok/callback`;
}

export function tiktokAuthorizeUrl(state: string): string | null {
  const creds = tiktokAppCredentials();
  if (!creds) return null;
  const q = new URLSearchParams({
    client_key: creds.clientKey,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: tiktokRedirectUri(),
    state,
  });
  return `${AUTHORIZE}?${q}`;
}

export async function getTikTokConnection(): Promise<TikTokConnectionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("social_connections").select("*").eq("network", "tiktok").maybeSingle();
  return (data as TikTokConnectionRow | null) ?? null;
}

function errorMessage(json: TikTokErrorBody, status: number): string {
  const coded = json.error;
  if (typeof coded === "string") return json.error_description || json.message || coded;
  if (coded?.code && coded.code !== "ok") return coded.message || coded.code;
  return json.message || `TikTok API returned ${status}`;
}

function errorCode(json: TikTokErrorBody): string {
  const coded = json.error;
  if (typeof coded === "string") return coded;
  return coded?.code ?? "";
}

async function tiktokTokenRequest(body: URLSearchParams): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  openId: string | null;
  scope: string | null;
}> {
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TikTokErrorBody & {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(errorMessage(json, res.status));
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null,
    openId: json.open_id ?? null,
    scope: json.scope ?? null,
  };
}

export async function exchangeTikTokCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  openId: string | null;
}> {
  const creds = tiktokAppCredentials();
  if (!creds) throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are required");
  const tokens = await tiktokTokenRequest(
    new URLSearchParams({
      client_key: creds.clientKey,
      client_secret: creds.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: tiktokRedirectUri(),
    }),
  );
  return tokens;
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}> {
  const creds = tiktokAppCredentials();
  if (!creds) throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are required");
  return tiktokTokenRequest(
    new URLSearchParams({
      client_key: creds.clientKey,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function saveTikTokConnection(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const existing = await getTikTokConnection();
  const { error } = await supabase.from("social_connections").upsert(
    {
      network: "tiktok",
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? existing?.refresh_token ?? null,
      board_id: null,
      token_expires_at: input.expiresAt ?? existing?.token_expires_at ?? null,
      meta: { ...(existing?.meta ?? {}), ...(input.meta ?? {}) },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "network" },
  );
  if (error) throw new Error(error.message);
}

async function tiktokJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TikTokErrorBody & { data?: T };
  const code = errorCode(json);
  if (!res.ok || (code && code !== "ok")) {
    const error = new Error(errorMessage(json, res.status));
    (error as Error & { tiktokCode?: string }).tiktokCode = code;
    throw error;
  }
  return (json.data ?? {}) as T;
}

export async function queryTikTokCreator(accessToken: string): Promise<TikTokCreator> {
  const data = await tiktokJson<{
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
  }>("/v2/post/publish/creator_info/query/", accessToken, {});
  return {
    username: data.creator_username ?? null,
    nickname: data.creator_nickname ?? null,
    privacyLevelOptions: data.privacy_level_options ?? [],
  };
}

function pickPrivacy(options: string[]): string {
  for (const level of PRIVACY_PREFERENCE) {
    if (options.includes(level)) return level;
  }
  return options[0] ?? "SELF_ONLY";
}

function isPrivateOnlyError(error: unknown): boolean {
  const code = error instanceof Error ? (error as Error & { tiktokCode?: string }).tiktokCode ?? "" : "";
  const message = error instanceof Error ? error.message : String(error);
  return /unaudited|private/i.test(`${code} ${message}`);
}

async function initPhotoPost(token: string, input: {
  title: string;
  description: string;
  imageUrl: string;
  privacyLevel: string;
}): Promise<string> {
  const data = await tiktokJson<{ publish_id?: string }>("/v2/post/publish/content/init/", token, {
    post_info: {
      title: input.title.slice(0, 90),
      description: input.description.slice(0, 4000),
      privacy_level: input.privacyLevel,
      disable_comment: false,
      auto_add_music: true,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: 0,
      photo_images: [input.imageUrl],
    },
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
  });
  if (!data.publish_id) throw new Error("TikTok did not return a publish id");
  return data.publish_id;
}

async function waitForPublish(token: string, publishId: string): Promise<string> {
  for (let attempt = 0; attempt < STATUS_ATTEMPTS; attempt++) {
    const status = await tiktokJson<{
      status?: string;
      fail_reason?: string;
      publicaly_available_post_id?: string[];
      publicly_available_post_id?: string[];
    }>("/v2/post/publish/status/fetch/", token, { publish_id: publishId });
    if (status.status === "PUBLISH_COMPLETE") {
      return status.publicly_available_post_id?.[0] || status.publicaly_available_post_id?.[0] || publishId;
    }
    if (status.status === "FAILED") throw new Error(status.fail_reason || "TikTok rejected the photo");
    if (attempt < STATUS_ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, STATUS_MS));
  }
  return publishId;
}

/** Load tokens from the DB (preferred) or env fallback. Null when not connected. */
export async function tiktokConfig(): Promise<TikTokConfig | null> {
  const creds = tiktokAppCredentials();
  const envToken = process.env.TIKTOK_ACCESS_TOKEN?.trim() || null;
  const envRefresh = process.env.TIKTOK_REFRESH_TOKEN?.trim() || null;

  let row: TikTokConnectionRow | null = null;
  try {
    row = await getTikTokConnection();
  } catch {
    row = null;
  }

  const accessToken = row?.access_token || envToken;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: row?.refresh_token || envRefresh,
    clientKey: creds?.clientKey ?? null,
    clientSecret: creds?.clientSecret ?? null,
  };
}

async function ensureFreshToken(config: TikTokConfig): Promise<string> {
  const row = await getTikTokConnection().catch(() => null);
  const expiresAt = row?.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
  const needsRefresh = expiresAt !== null && expiresAt < Date.now() + 60_000;
  if (!needsRefresh) return config.accessToken;
  if (!config.refreshToken || !config.clientKey || !config.clientSecret) return config.accessToken;
  const next = await refreshTikTokToken(config.refreshToken);
  try {
    await saveTikTokConnection({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: next.expiresAt,
    });
  } catch (error) {
    console.error("[social] could not persist refreshed TikTok token:", error);
  }
  return next.accessToken;
}

export async function postToTikTok({
  config,
  title,
  description,
  imageUrl,
}: {
  config: TikTokConfig;
  title: string;
  description: string;
  imageUrl: string;
}): Promise<{ id: string }> {
  let token = await ensureFreshToken(config);
  let creator: TikTokCreator = { username: null, nickname: null, privacyLevelOptions: [] };
  try {
    creator = await queryTikTokCreator(token);
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { tiktokCode?: string }).tiktokCode : "";
    const authFailure = code === "access_token_invalid" || /access_token|unauthorized/i.test(error instanceof Error ? error.message : "");
    if (!authFailure || !config.refreshToken) throw error;
    const next = await refreshTikTokToken(config.refreshToken);
    await saveTikTokConnection({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: next.expiresAt,
    });
    token = next.accessToken;
    creator = await queryTikTokCreator(token);
  }

  const privacy = pickPrivacy(creator.privacyLevelOptions);
  try {
    const publishId = await initPhotoPost(token, { title, description, imageUrl, privacyLevel: privacy });
    return { id: await waitForPublish(token, publishId) };
  } catch (error) {
    if (privacy === "SELF_ONLY" || !isPrivateOnlyError(error)) throw error;
    const publishId = await initPhotoPost(token, { title, description, imageUrl, privacyLevel: "SELF_ONLY" });
    return { id: await waitForPublish(token, publishId) };
  }
}

export async function disconnectTikTok(): Promise<void> {
  const creds = tiktokAppCredentials();
  const row = await getTikTokConnection();
  if (creds && row?.access_token) {
    const body = new URLSearchParams({
      client_key: creds.clientKey,
      client_secret: creds.clientSecret,
      token: row.access_token,
    });
    await fetch(`${API}/v2/oauth/revoke/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    }).catch(() => undefined);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("social_connections").delete().eq("network", "tiktok");
  if (error) throw new Error(error.message);
}
