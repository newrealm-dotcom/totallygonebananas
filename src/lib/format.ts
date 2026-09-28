export function timeLabel(minutes: number | null, note?: string | null) {
  if (note) return note;
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} hr${m ? ` ${m} min` : ""}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recipe"
  );
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** YYYY-MM-DD for an instant in Eastern Time (for /blog?date= filters). */
export function easternDateKey(iso: string): string {
  const parts = easternParts(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** UTC start (inclusive) and end (exclusive) for an Eastern calendar day. */
export function easternDayRange(dateKey: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, month, d] = dateKey.split("-").map(Number);
  let utc = Date.UTC(y, month - 1, d, 0, 0, 0);
  utc = Date.UTC(y, month - 1, d, 0, 0, 0) - easternOffsetMs(new Date(utc));
  utc = Date.UTC(y, month - 1, d, 0, 0, 0) - easternOffsetMs(new Date(utc));
  const start = new Date(utc);
  const end = new Date(utc + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

const EASTERN_TZ = "America/New_York";

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** `datetime-local` value (YYYY-MM-DDTHH:mm) in Eastern Time. */
export function toEasternDatetimeLocal(iso?: string | null): string {
  const parts = easternParts(iso ? new Date(iso) : new Date());
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function easternOffsetMs(at: Date): number {
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = tz?.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return -5 * 60 * 60 * 1000;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60 * 1000;
}

/** Interpret a `datetime-local` string as Eastern Time and return UTC ISO. */
export function easternDatetimeLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const [datePart, timePart] = local.split("T");
  const [y, month, d] = datePart.split("-").map(Number);
  const [h, minute] = timePart.split(":").map(Number);
  let utc = Date.UTC(y, month - 1, d, h, minute, 0);
  utc = Date.UTC(y, month - 1, d, h, minute, 0) - easternOffsetMs(new Date(utc));
  utc = Date.UTC(y, month - 1, d, h, minute, 0) - easternOffsetMs(new Date(utc));
  return new Date(utc).toISOString();
}

/** Capitalize the first letter of each word (preserves the rest of each word). */
export function titleCase(s: string) {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

const TINTS = ["#F9E798", "#F4BC9C", "#C7E7D7", "#F9D3DA", "#CEE1F3", "#DBD0F0", "#CEDFA2", "#F1D8BC"];
export function tintFor(categoryId: string | null, categories: { id: string }[]) {
  const i = Math.max(0, categories.findIndex((c) => c.id === categoryId));
  return TINTS[i % TINTS.length];
}
