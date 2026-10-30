function supabaseConnectSources(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "https://*.supabase.co wss://*.supabase.co";
  try {
    const host = new URL(raw).host;
    return `https://${host} wss://${host}`;
  } catch {
    return "https://*.supabase.co wss://*.supabase.co";
  }
}

/**
 * Script hosts are this site, Google Analytics (loaded through Google Tag Manager),
 * and Microsoft Clarity. No strict-dynamic: a nonce'd loader must not be able to
 * pull in scripts from any other host.
 */
export function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "https://*.googletagmanager.com",
    "https://www.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://www.google-analytics.com",
    "https://ssl.google-analytics.com",
    "https://www.clarity.ms",
    "https://scripts.clarity.ms",
    "https://*.clarity.ms",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = [
    "'self'",
    supabaseConnectSources(),
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://*.clarity.ms",
    "https://c.bing.com",
    isDev ? "ws: wss:" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob: https:",
    "frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}
