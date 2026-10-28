import { createHmac, randomBytes } from "node:crypto";
import sharp from "sharp";

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

/** Null when any OAuth 1.0a user-token setting is missing, which turns X auto-posting off. */
export function twitterConfig(): TwitterConfig | null {
  const apiKey = process.env.TWITTER_API_KEY?.trim();
  const apiSecret = process.env.TWITTER_API_SECRET?.trim();
  const accessToken = process.env.TWITTER_ACCESS_TOKEN?.trim();
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET?.trim();
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

const MEDIA_API = "https://api.x.com/2/media/upload";
const TWEET_API = "https://api.twitter.com/2/tweets";
const IMAGE_CAP = 5 * 1024 * 1024;

interface TwitterErrorBody {
  detail?: string;
  title?: string;
  errors?: { message?: string }[];
  error?: string;
}

function oauthHeader(config: TwitterConfig, method: string, url: string, query: Record<string, string> = {}): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: config.accessToken,
    oauth_version: "1.0",
  };
  const signed = { ...query, ...oauth };
  const paramString = Object.keys(signed)
    .sort()
    .map((key) => `${rfc3986(key)}=${rfc3986(signed[key])}`)
    .join("&");
  const base = [method.toUpperCase(), rfc3986(url), rfc3986(paramString)].join("&");
  const signingKey = `${rfc3986(config.apiSecret)}&${rfc3986(config.accessSecret)}`;
  oauth.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");
  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${rfc3986(key)}="${rfc3986(oauth[key])}"`)
    .join(", ")}`;
}

function twitterError(json: TwitterErrorBody, status: number): string {
  return json.detail || json.title || json.errors?.[0]?.message || json.error || `X API returned ${status}`;
}

async function loadCoverJpeg(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Cover image unavailable (${res.status})`);
  let bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > IMAGE_CAP) {
    bytes = await sharp(bytes).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  }
  if (bytes.length > IMAGE_CAP) throw new Error("Cover image is over X's 5 MB limit");
  return bytes;
}

/** Chunked image upload. X signs the OAuth header only; the file body is not part of the signature. */
async function uploadTwitterImage(config: TwitterConfig, imageUrl: string): Promise<string> {
  const bytes = await loadCoverJpeg(imageUrl);
  const initRes = await fetch(`${MEDIA_API}/initialize`, {
    method: "POST",
    headers: {
      Authorization: oauthHeader(config, "POST", `${MEDIA_API}/initialize`),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: "image/jpeg",
      total_bytes: bytes.length,
      media_category: "tweet_image",
    }),
    cache: "no-store",
  });
  const initJson = (await initRes.json().catch(() => ({}))) as TwitterErrorBody & {
    data?: { id?: string; processing_info?: { state?: string; check_after_secs?: number } };
  };
  const mediaId = initJson.data?.id;
  if (!initRes.ok || !mediaId) throw new Error(twitterError(initJson, initRes.status));

  const form = new FormData();
  form.set("segment_index", "0");
  form.set("media", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), "cover.jpg");
  const appendUrl = `${MEDIA_API}/${encodeURIComponent(mediaId)}/append`;
  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: { Authorization: oauthHeader(config, "POST", appendUrl) },
    body: form,
    cache: "no-store",
  });
  if (!appendRes.ok) {
    const appendJson = (await appendRes.json().catch(() => ({}))) as TwitterErrorBody;
    throw new Error(twitterError(appendJson, appendRes.status));
  }

  const finalizeUrl = `${MEDIA_API}/${encodeURIComponent(mediaId)}/finalize`;
  const finalizeRes = await fetch(finalizeUrl, {
    method: "POST",
    headers: { Authorization: oauthHeader(config, "POST", finalizeUrl) },
    cache: "no-store",
  });
  const finalizeJson = (await finalizeRes.json().catch(() => ({}))) as TwitterErrorBody & {
    data?: { processing_info?: { state?: string; check_after_secs?: number; error?: { message?: string } } };
  };
  if (!finalizeRes.ok) throw new Error(twitterError(finalizeJson, finalizeRes.status));

  let processing = finalizeJson.data?.processing_info;
  for (let attempt = 0; processing && attempt < 5; attempt++) {
    if (processing.state === "succeeded") break;
    if (processing.state === "failed") {
      throw new Error(processing.error?.message || "X could not process the cover image");
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min((processing?.check_after_secs ?? 1) * 1000, 5000)));
    const query = { command: "STATUS", media_id: mediaId };
    const statusUrl = new URL(MEDIA_API);
    statusUrl.search = new URLSearchParams(query).toString();
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: oauthHeader(config, "GET", MEDIA_API, query) },
      cache: "no-store",
    });
    const statusJson = (await statusRes.json().catch(() => ({}))) as TwitterErrorBody & {
      data?: { processing_info?: { state?: string; check_after_secs?: number; error?: { message?: string } } };
    };
    if (!statusRes.ok) throw new Error(twitterError(statusJson, statusRes.status));
    processing = statusJson.data?.processing_info;
  }
  if (processing && processing.state !== "succeeded") throw new Error("X took too long to process the cover image");
  return mediaId;
}

export async function postToTwitter({
  config,
  text,
  imageUrl,
}: {
  config: TwitterConfig;
  text: string;
  imageUrl?: string | null;
}): Promise<{ id: string }> {
  const mediaId = imageUrl ? await uploadTwitterImage(config, imageUrl) : null;
  const res = await fetch(TWEET_API, {
    method: "POST",
    headers: {
      Authorization: oauthHeader(config, "POST", TWEET_API),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mediaId ? { text, media: { media_ids: [mediaId] } } : { text }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TwitterErrorBody & { data?: { id?: string } };
  const id = json.data?.id;
  if (!res.ok || !id) throw new Error(twitterError(json, res.status));
  return { id };
}
