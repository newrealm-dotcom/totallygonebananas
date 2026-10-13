import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface GaConfig {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface GaTotals {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  eventCount: number;
  avgEngagementSeconds: number;
}

export interface GaDailyPoint {
  date: string;
  pageViews: number;
  activeUsers: number;
}

export interface GaRow {
  label: string;
  value: number;
  secondary: number;
}

export interface GaDashboard {
  totals: GaTotals;
  daily: GaDailyPoint[];
  topPages: GaRow[];
  events: GaRow[];
  sources: GaRow[];
  buttons: GaRow[];
  /** form_fill broken down by form_name (+ source/intent when set). */
  forms: GaRow[];
  formsByPage: GaRow[];
  newsletterSources: GaRow[];
  signupIntents: GaRow[];
  conversionFunnel: GaRow[];
  realtime: GaRealtime;
}

export interface GaRealtime {
  activeUsers: number;
  events: GaRow[];
}

interface ReportRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  orderBys?: unknown[];
  limit?: number;
  dimensionFilter?: unknown;
  keepEmptyRows?: boolean;
}

interface ReportResponse {
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
}

export function gaConfig(): GaConfig | null {
  const propertyId = process.env.GA_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(config: GaConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: config.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description ?? "Could not authenticate with Google");

  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

async function batchRunReports(config: GaConfig, range: DateRange, requests: ReportRequest[]): Promise<ReportResponse[]> {
  const token = await accessToken(config);
  const dateRanges = [{ startDate: range.start, endDate: range.end }];
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:batchRunReports`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ requests: requests.map((r) => ({ ...r, dateRanges })) }),
    cache: "no-store",
  });
  const json = (await res.json()) as { reports?: ReportResponse[]; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google Analytics request failed (${res.status})`);
  return json.reports ?? [];
}

async function runRealtimeReport(config: GaConfig, request: ReportRequest): Promise<ReportResponse> {
  const token = await accessToken(config);
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:runRealtimeReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });
  const json = (await res.json()) as ReportResponse & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google Analytics realtime request failed (${res.status})`);
  return json;
}

const num = (v: string | undefined) => Number(v ?? 0) || 0;

function toRows(report: ReportResponse | undefined): GaRow[] {
  return (report?.rows ?? []).map((r) => ({
    label: r.dimensionValues?.[0]?.value || "(not set)",
    value: num(r.metricValues?.[0]?.value),
    secondary: num(r.metricValues?.[1]?.value),
  }));
}

/** Join first dim with optional second dim (source / intent) when present. */
function toComboRows(report: ReportResponse | undefined): GaRow[] {
  return (report?.rows ?? []).map((r) => {
    const primary = r.dimensionValues?.[0]?.value || "(not set)";
    const secondaryDim = r.dimensionValues?.[1]?.value;
    const detail =
      secondaryDim && secondaryDim !== "(not set)" && secondaryDim !== "(other)"
        ? ` · ${secondaryDim}`
        : "";
    return {
      label: `${primary}${detail}`,
      value: num(r.metricValues?.[0]?.value),
      secondary: num(r.metricValues?.[1]?.value),
    };
  });
}

const byMetricDesc = (name: string) => [{ metric: { metricName: name }, desc: true }];
const eventIs = (name: string) => ({
  filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: name } },
});
const eventIn = (names: string[]) => ({
  filter: { fieldName: "eventName", inListFilter: { values: names } },
});

/** customEvent:* dims only work after registration in GA4 Admin → Custom definitions. */
async function customEventReport(
  config: GaConfig,
  range: DateRange,
  request: ReportRequest,
): Promise<ReportResponse | undefined> {
  try {
    const [report] = await batchRunReports(config, range, [request]);
    return report;
  } catch {
    return undefined;
  }
}

const FUNNEL_EVENTS = [
  "signup_gate",
  "sign_up_start",
  "login_complete",
  "form_fill",
  "newsletter_signup",
  "save_recipe",
  "cook_log",
] as const;

export async function fetchDashboard(range: DateRange): Promise<GaDashboard> {
  const config = gaConfig();
  if (!config) throw new Error("Google Analytics is not configured");

  const [
    core,
    formsByPageReports,
    formNameReport,
    newsletterSourceReport,
    signupIntentReport,
    buttonReports,
    funnelReports,
    realtimeUsers,
    realtimeEvents,
  ] = await Promise.all([
    batchRunReports(config, range, [
      {
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
          { name: "userEngagementDuration" },
        ],
      },
      {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        keepEmptyRows: true,
        limit: 400,
      },
      {
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: byMetricDesc("screenPageViews"),
        limit: 15,
      },
      {
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        orderBys: byMetricDesc("eventCount"),
        limit: 25,
      },
      {
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: byMetricDesc("sessions"),
        limit: 10,
      },
    ]),
    batchRunReports(config, range, [
      {
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: eventIs("form_fill"),
        orderBys: byMetricDesc("eventCount"),
        limit: 15,
      },
    ]),
    // Prefer form_name + source; fall back to form_name alone if source isn't registered yet.
    customEventReport(config, range, {
      dimensions: [{ name: "customEvent:form_name" }, { name: "customEvent:source" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: eventIs("form_fill"),
      orderBys: byMetricDesc("eventCount"),
      limit: 25,
    }).then(
      (combo) =>
        combo ??
        customEventReport(config, range, {
          dimensions: [{ name: "customEvent:form_name" }],
          metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
          dimensionFilter: eventIs("form_fill"),
          orderBys: byMetricDesc("eventCount"),
          limit: 25,
        }),
    ),
    customEventReport(config, range, {
      dimensions: [{ name: "customEvent:source" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: eventIs("newsletter_signup"),
      orderBys: byMetricDesc("eventCount"),
      limit: 10,
    }),
    customEventReport(config, range, {
      dimensions: [{ name: "customEvent:intent" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: eventIs("signup_gate"),
      orderBys: byMetricDesc("eventCount"),
      limit: 15,
    }),
    customEventReport(config, range, {
      dimensions: [{ name: "customEvent:button_text" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: eventIs("button_click"),
      orderBys: byMetricDesc("eventCount"),
      limit: 15,
    }),
    batchRunReports(config, range, [
      {
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: eventIn([...FUNNEL_EVENTS]),
        orderBys: byMetricDesc("eventCount"),
        limit: 20,
      },
    ]),
    runRealtimeReport(config, { metrics: [{ name: "activeUsers" }] }).catch((): ReportResponse => ({})),
    runRealtimeReport(config, {
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: byMetricDesc("eventCount"),
      limit: 15,
    }).catch((): ReportResponse => ({})),
  ]);

  const [totalsReport, dailyReport, pagesReport, eventsReport, sourcesReport] = core;
  const t = totalsReport?.rows?.[0]?.metricValues ?? [];
  const activeUsers = num(t[0]?.value);
  const engagement = num(t[5]?.value);

  const formsByName = toComboRows(formNameReport);
  const formsByPage = toRows(formsByPageReports[0]);

  return {
    totals: {
      activeUsers,
      newUsers: num(t[1]?.value),
      sessions: num(t[2]?.value),
      pageViews: num(t[3]?.value),
      eventCount: num(t[4]?.value),
      avgEngagementSeconds: activeUsers > 0 ? engagement / activeUsers : 0,
    },
    daily: (dailyReport?.rows ?? []).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      pageViews: num(r.metricValues?.[0]?.value),
      activeUsers: num(r.metricValues?.[1]?.value),
    })),
    topPages: toRows(pagesReport),
    events: toRows(eventsReport),
    sources: toRows(sourcesReport),
    buttons: toRows(buttonReports),
    forms: formsByName,
    formsByPage,
    newsletterSources: toRows(newsletterSourceReport),
    signupIntents: toRows(signupIntentReport),
    conversionFunnel: toRows(funnelReports[0]),
    realtime: {
      activeUsers: num(realtimeUsers.rows?.[0]?.metricValues?.[0]?.value),
      events: toRows(realtimeEvents),
    },
  };
}
