#!/usr/bin/env node
/**
 * Creates GTM variables / custom-event triggers / GA4 event tags for TGB conversion events,
 * then creates a container version and publishes it.
 */
import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ACCOUNT = "6380447537";
const CONTAINER = "266029495";
const WORKSPACE = "4";
const MEASUREMENT_ID = "G-454JH56MB6";
const BASE = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${ACCOUNT}/containers/${CONTAINER}/workspaces/${WORKSPACE}`;

const EVENTS = [
  {
    name: "button_click",
    params: ["button_text", "intent", "recipe_id", "source"],
  },
  {
    name: "form_fill",
    params: ["form_name", "method", "intent", "source", "recipe_id"],
  },
  { name: "login_complete", params: ["method"] },
  { name: "sign_up_start", params: ["method", "intent"] },
  { name: "signup_gate", params: ["intent", "recipe_id", "path"] },
  { name: "save_recipe", params: ["recipe_id"] },
  { name: "unsave_recipe", params: ["recipe_id"] },
  { name: "cook_log", params: ["recipe_id", "rating"] },
  { name: "newsletter_signup", params: ["source"] },
];

const DLV_KEYS = [
  "button_text",
  "form_name",
  "intent",
  "source",
  "method",
  "recipe_id",
  "rating",
  "path",
];

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v.replace(/\\n/g, "\n");
  }
  return out;
}

async function getToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: env.GA_CLIENT_EMAIL,
      scope: [
        "https://www.googleapis.com/auth/tagmanager.edit.containers",
        "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
        "https://www.googleapis.com/auth/tagmanager.publish",
        "https://www.googleapis.com/auth/tagmanager.readonly",
      ].join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const jwt = `${unsigned}.${sign.sign(env.GA_PRIVATE_KEY, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(`Token failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

async function api(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function dlvName(key) {
  return `dlv - ${key}`;
}

async function ensureVariables(token) {
  const existing = await api(token, "GET", `${BASE}/variables`);
  const byName = new Map((existing.variable ?? []).map((v) => [v.name, v]));

  for (const key of DLV_KEYS) {
    const name = dlvName(key);
    if (byName.has(name)) continue;
    const created = await api(token, "POST", `${BASE}/variables`, {
      name,
      type: "v",
      parameter: [
        { type: "integer", key: "dataLayerVersion", value: "2" },
        { type: "boolean", key: "setDefaultValue", value: "false" },
        { type: "template", key: "name", value: key },
      ],
    });
    byName.set(name, created);
    console.log(`+ variable ${name}`);
  }

  const constName = "const - GA4 Measurement ID";
  if (!byName.has(constName)) {
    const created = await api(token, "POST", `${BASE}/variables`, {
      name: constName,
      type: "c",
      parameter: [{ type: "template", key: "value", value: MEASUREMENT_ID }],
    });
    byName.set(constName, created);
    console.log(`+ variable ${constName}`);
  }

  return byName;
}

async function ensureTriggers(token) {
  const existing = await api(token, "GET", `${BASE}/triggers`);
  const byName = new Map((existing.trigger ?? []).map((t) => [t.name, t]));

  for (const event of EVENTS) {
    const name = `CE - ${event.name}`;
    if (byName.has(name)) continue;
    const created = await api(token, "POST", `${BASE}/triggers`, {
      name,
      type: "customEvent",
      customEventFilter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{_event}}" },
            { type: "template", key: "arg1", value: event.name },
          ],
        },
      ],
    });
    byName.set(name, created);
    console.log(`+ trigger ${name}`);
  }
  return byName;
}

function eventParamsList(paramKeys) {
  return {
    type: "list",
    key: "eventSettingsTable",
    list: paramKeys.map((key) => ({
      type: "map",
      map: [
        { type: "template", key: "parameter", value: key },
        { type: "template", key: "parameterValue", value: `{{${dlvName(key)}}}` },
      ],
    })),
  };
}

async function ensureTags(token, triggers) {
  const existing = await api(token, "GET", `${BASE}/tags`);
  const byName = new Map((existing.tag ?? []).map((t) => [t.name, t]));

  for (const event of EVENTS) {
    const name = `GA4 Event - ${event.name}`;
    const trigger = triggers.get(`CE - ${event.name}`);
    if (!trigger) throw new Error(`Missing trigger for ${event.name}`);
    if (byName.has(name)) continue;

    const created = await api(token, "POST", `${BASE}/tags`, {
      name,
      type: "gaawe",
      firingTriggerId: [trigger.triggerId],
      tagFiringOption: "oncePerEvent",
      parameter: [
        { type: "boolean", key: "sendEcommerceData", value: "false" },
        { type: "template", key: "eventName", value: event.name },
        {
          type: "template",
          key: "measurementIdOverride",
          value: "{{const - GA4 Measurement ID}}",
        },
        eventParamsList(event.params),
      ],
    });
    byName.set(name, created);
    console.log(`+ tag ${name}`);
  }
  return byName;
}

async function publish(token) {
  // Needs Approve + Publish container permissions on the service account.
  const version = await api(token, "POST", `${BASE}:create_version`, {
    name: `TGB conversion events ${new Date().toISOString().slice(0, 10)}`,
    notes: "GA4 event tags for member conversion funnel (button_click, form_fill, login_complete, etc.)",
  });
  const versionId = version.containerVersion?.containerVersionId;
  if (!versionId) throw new Error(`create_version failed: ${JSON.stringify(version)}`);
  console.log(`+ version ${versionId}`);

  const published = await api(
    token,
    "POST",
    `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${ACCOUNT}/containers/${CONTAINER}/versions/${versionId}:publish`,
  );
  console.log(`published: ${published.containerVersion?.name ?? versionId}`);
  return published;
}

async function main() {
  const env = loadEnv(path.join(process.cwd(), ".env.local"));
  const token = await getToken(env);

  const accounts = await api(token, "GET", "https://tagmanager.googleapis.com/tagmanager/v2/accounts");
  if (!(accounts.account ?? []).length) {
    throw new Error("Service account still has no GTM account access. Invite may not have completed.");
  }

  await ensureVariables(token);
  const triggers = await ensureTriggers(token);
  await ensureTags(token, triggers);
  await publish(token);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
