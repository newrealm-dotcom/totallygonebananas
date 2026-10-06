import { createHmac, randomBytes } from "node:crypto";

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

function oauthHeader(config: TwitterConfig, method: string, url: string): string {
  const params: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: config.accessToken,
    oauth_version: "1.0",
  };
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${rfc3986(key)}=${rfc3986(params[key])}`)
    .join("&");
  const base = [method.toUpperCase(), rfc3986(url), rfc3986(paramString)].join("&");
  const signingKey = `${rfc3986(config.apiSecret)}&${rfc3986(config.accessSecret)}`;
  params.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");
  return `OAuth ${Object.keys(params)
    .sort()
    .map((key) => `${rfc3986(key)}="${rfc3986(params[key])}"`)
    .join(", ")}`;
}

export async function postToTwitter({
  config,
  text,
}: {
  config: TwitterConfig;
  text: string;
}): Promise<{ id: string }> {
  const url = "https://api.twitter.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader(config, "POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string };
    detail?: string;
    title?: string;
    errors?: { message?: string }[];
  };
  const id = json.data?.id;
  if (!res.ok || !id) {
    throw new Error(json.detail || json.title || json.errors?.[0]?.message || `Twitter API returned ${res.status}`);
  }
  return { id };
}
