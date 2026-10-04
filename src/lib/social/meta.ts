// Facebook Page + Instagram publishing through Meta's free Graph API.

export interface MetaConfig {
  pageId: string;
  pageToken: string;
  igUserId: string | null;
  graphBase: string;
}

interface GraphError {
  error?: { message?: string };
}

const IG_POLL_ATTEMPTS = 10;
const IG_POLL_MS = 3000;

/** Null when the Page ID or token is missing, which turns auto-posting off. */
export function metaConfig(): MetaConfig | null {
  const pageId = process.env.META_PAGE_ID?.trim();
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!pageId || !pageToken) return null;
  const version = process.env.META_GRAPH_VERSION?.trim() || "v26.0";
  return {
    pageId,
    pageToken,
    igUserId: process.env.META_IG_USER_ID?.trim() || null,
    graphBase: `https://graph.facebook.com/${version}`,
  };
}

async function graph<T>(
  config: MetaConfig,
  path: string,
  { method = "POST", params = {} }: { method?: "GET" | "POST"; params?: Record<string, string> } = {},
): Promise<T> {
  const query = new URLSearchParams({ ...params, access_token: config.pageToken });
  const url = `${config.graphBase}/${path}`;
  const res =
    method === "GET"
      ? await fetch(`${url}?${query}`, { cache: "no-store" })
      : await fetch(url, { method: "POST", body: query, cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok || json.error) throw new Error(json.error?.message || `Meta API returned ${res.status}`);
  return json;
}

export async function postToFacebook({
  config,
  message,
  link,
}: {
  config: MetaConfig;
  message: string;
  link: string;
}): Promise<{ id: string }> {
  return graph<{ id: string }>(config, `${config.pageId}/feed`, { params: { message, link } });
}

/** Instagram needs a public JPEG URL; the container must finish processing before publishing. */
export async function postToInstagram({
  config,
  imageUrl,
  caption,
}: {
  config: MetaConfig;
  imageUrl: string;
  caption: string;
}): Promise<{ id: string }> {
  if (!config.igUserId) throw new Error("META_IG_USER_ID is not set");
  const container = await graph<{ id: string }>(config, `${config.igUserId}/media`, {
    params: { image_url: imageUrl, caption },
  });

  for (let attempt = 0; attempt < IG_POLL_ATTEMPTS; attempt++) {
    const { status_code } = await graph<{ status_code?: string }>(config, container.id, {
      method: "GET",
      params: { fields: "status_code" },
    });
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Instagram couldn't process the image (${status_code})`);
    if (attempt === IG_POLL_ATTEMPTS - 1) throw new Error("Instagram took too long to process the image");
    await new Promise((resolve) => setTimeout(resolve, IG_POLL_MS));
  }

  return graph<{ id: string }>(config, `${config.igUserId}/media_publish`, {
    params: { creation_id: container.id },
  });
}
