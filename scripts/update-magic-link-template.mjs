/**
 * Pushes supabase/templates/magic_link.html to the hosted Supabase project.
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN=sbp_...   # from https://supabase.com/dashboard/account/tokens
 *   export SUPABASE_PROJECT_REF=nmkdpekkkjmaedpiiimq
 *   node scripts/update-magic-link-template.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF ?? "nmkdpekkkjmaedpiiimq";
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const content = readFileSync(resolve(root, "supabase/templates/magic_link.html"), "utf8").trim();
const confirmation = readFileSync(resolve(root, "supabase/templates/confirmation.html"), "utf8").trim();

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_magic_link: "Your sign-in link",
    mailer_templates_magic_link_content: content,
    mailer_subjects_confirmation: "Confirm your email",
    mailer_templates_confirmation_content: confirmation,
  }),
});

if (!res.ok) {
  console.error(res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const saved = data.mailer_templates_magic_link_content ?? "";
const savedConfirmation = data.mailer_templates_confirmation_content ?? "";
console.log(
  saved.includes("token_hash")
    ? "Magic Link template updated (token_hash SSR flow)."
    : "Updated, but token_hash was not found in the saved magic-link template — check the dashboard.",
);
console.log(
  savedConfirmation.includes("type=signup")
    ? "Confirmation template updated (opens /profile after confirm)."
    : "Updated, but the confirmation template did not save the signup callback — check the dashboard.",
);
