import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

const API = "https://api.pinterest.com/v5";
const OAUTH = "https://www.pinterest.com/oauth/";
const SCOPES = ["boards:read", "pins:read", "pins:write"].join(",");

export interface PinterestConfig {
  accessToken: string;
  boardId: string;
  refreshToken: string | null;
  appId: string | null;
  appSecret: string | null;
}

export interface PinterestBoard {
  id: string;
  name: string;
  privacy?: string;
}

interface PinterestConnectionRow {
  access_token: string;
  refresh_token: string | null;
  board_id: string | null;
  token_expires_at: string | null;
  meta: Record<string, unknown> | null;
}

export function pinterestAppCredentials(): { appId: string; appSecret: string } | null {
  const appId = process.env.PINTEREST_APP_ID?.trim();
  const appSecret = process.env.PINTEREST_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

export function pinterestRedirectUri(): string {
  return `${siteUrl()}/api/pinterest/callback`;
}

export function pinterestAuthorizeUrl(state: string): string | null {
  const creds = pinterestAppCredentials();
  if (!creds) return null;
  const q = new URLSearchParams({
    client_id: creds.appId,
    redirect_uri: pinterestRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${OAUTH}?${q}`;
}

/** Load tokens from the DB (preferred) or env fallback. Null when not fully configured. */
export async function pinterestConfig(): Promise<PinterestConfig | null> {
  const creds = pinterestAppCredentials();
  const envToken = process.env.PINTEREST_ACCESS_TOKEN?.trim() || null;
  const envBoard = process.env.PINTEREST_BOARD_ID?.trim() || null;
  const envRefresh = process.env.PINTEREST_REFRESH_TOKEN?.trim() || null;

  let row: PinterestConnectionRow | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("social_connections").select("*").eq("network", "pinterest").maybeSingle();
    row = (data as PinterestConnectionRow | null) ?? null;
  } catch {
    row = null;
  }

  const accessToken = row?.access_token || envToken;
  const boardId = row?.board_id || envBoard;
  if (!accessToken || !boardId) return null;

  return {
    accessToken,
    boardId,
    refreshToken: row?.refresh_token || envRefresh,
    appId: creds?.appId ?? null,
    appSecret: creds?.appSecret ?? null,
  };
}

export async function getPinterestConnection(): Promise<PinterestConnectionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("social_connections").select("*").eq("network", "pinterest").maybeSingle();
  return (data as PinterestConnectionRow | null) ?? null;
}

async function pinterestFetch<T>(
  path: string,
  {
    method = "GET",
    token,
    body,
  }: { method?: "GET" | "POST" | "PATCH"; token: string; body?: unknown } = { token: "" },
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    code?: number;
  };
  if (!res.ok) {
    throw new Error(json.message || `Pinterest API returned ${res.status}`);
  }
  return json;
}

export async function exchangePinterestCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}> {
  const creds = pinterestAppCredentials();
  if (!creds) throw new Error("PINTEREST_APP_ID and PINTEREST_APP_SECRET are required");
  const basic = Buffer.from(`${creds.appId}:${creds.appSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: pinterestRedirectUri(),
  });
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || `Pinterest OAuth failed (${res.status})`);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null,
  };
}

export async function refreshPinterestToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}> {
  const creds = pinterestAppCredentials();
  if (!creds) throw new Error("PINTEREST_APP_ID and PINTEREST_APP_SECRET are required");
  const basic = Buffer.from(`${creds.appId}:${creds.appSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || `Pinterest token refresh failed (${res.status})`);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null,
  };
}

export async function savePinterestConnection(input: {
  accessToken: string;
  refreshToken?: string | null;
  boardId?: string | null;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const existing = await getPinterestConnection();
  const { error } = await supabase.from("social_connections").upsert(
    {
      network: "pinterest",
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? existing?.refresh_token ?? null,
      board_id: input.boardId !== undefined ? input.boardId : existing?.board_id ?? null,
      token_expires_at: input.expiresAt ?? existing?.token_expires_at ?? null,
      meta: input.meta ?? existing?.meta ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "network" },
  );
  if (error) throw new Error(error.message);
}

export async function setPinterestBoardId(boardId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("social_connections")
    .update({ board_id: boardId, updated_at: new Date().toISOString() })
    .eq("network", "pinterest");
  if (error) throw new Error(error.message);
}

export async function disconnectPinterest(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("social_connections").delete().eq("network", "pinterest");
  if (error) throw new Error(error.message);
}

export async function listPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  const json = await pinterestFetch<{ items?: { id: string; name: string; privacy?: string }[] }>(
    "/boards?page_size=50",
    { token: accessToken },
  );
  return (json.items ?? []).map((b) => ({ id: b.id, name: b.name, privacy: b.privacy }));
}

async function ensureFreshToken(config: PinterestConfig): Promise<string> {
  const row = await getPinterestConnection();
  const expiresAt = row?.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
  const needsRefresh = expiresAt !== null && expiresAt < Date.now() + 60_000;
  if (!needsRefresh) return config.accessToken;
  if (!config.refreshToken || !config.appId || !config.appSecret) return config.accessToken;

  const next = await refreshPinterestToken(config.refreshToken);
  try {
    await savePinterestConnection({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: next.expiresAt,
    });
  } catch (error) {
    console.error("[social] could not persist refreshed Pinterest token:", error);
  }
  return next.accessToken;
}

export async function postToPinterest({
  config,
  title,
  description,
  link,
  imageUrl,
}: {
  config: PinterestConfig;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
}): Promise<{ id: string }> {
  let token = await ensureFreshToken(config);
  const body = {
    board_id: config.boardId,
    title: title.slice(0, 100),
    description: description.slice(0, 800),
    link,
    media_source: {
      source_type: "image_url",
      url: imageUrl,
    },
  };

  try {
    const created = await pinterestFetch<{ id?: string }>("/pins", { method: "POST", token, body });
    if (!created.id) throw new Error("Pinterest did not return a pin id");
    return { id: created.id };
  } catch (error) {
    // One retry after forced refresh on auth failures.
    if (!config.refreshToken) throw error;
    const next = await refreshPinterestToken(config.refreshToken);
    await savePinterestConnection({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: next.expiresAt,
    });
    token = next.accessToken;
    const created = await pinterestFetch<{ id?: string }>("/pins", { method: "POST", token, body });
    if (!created.id) throw new Error("Pinterest did not return a pin id");
    return { id: created.id };
  }
}
