import { TAGS } from "@/lib/types";

export const MAX_TAGS = 12;
export const TAG_MIN_LEN = 2;
export const TAG_MAX_LEN = 24;

/** Letters/numbers with optional single spaces or hyphens between words. */
const TAG_RE = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

/** Matched as whole words only (avoids "shell", "class", "cocktail"). */
const BLOCKED_EXACT = new Set([
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "cock",
  "crap",
  "cunt",
  "damn",
  "dick",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucker",
  "fucking",
  "goddamn",
  "hell",
  "jackass",
  "jizz",
  "kike",
  "nazi",
  "nigga",
  "nigger",
  "piss",
  "porn",
  "pussy",
  "retard",
  "shit",
  "slut",
  "spic",
  "twat",
  "wank",
  "wanker",
  "whore",
]);

/** Severe stems caught inside compounds (e.g. "fuckthis"). */
const BLOCKED_STEMS = ["fuck", "shit", "nigger", "faggot", "motherfuck", "cunt"];

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function lettersOnly(s: string): string {
  return s.replace(/[^a-z]/g, "");
}

function containsBlockedWord(tag: string): boolean {
  const tokens = tag.split(/[\s-]+/).map(lettersOnly).filter(Boolean);
  if (tokens.some((t) => BLOCKED_EXACT.has(t))) return true;
  const compact = lettersOnly(tag);
  return BLOCKED_STEMS.some((w) => compact.includes(w));
}

/** Heuristics for keyboard smash / nonsense tags. Preset diet tags always pass. */
function looksLikeGibberish(tag: string): boolean {
  if ((TAGS as readonly string[]).includes(tag)) return false;
  const letters = lettersOnly(tag);
  if (letters.length < TAG_MIN_LEN) return true;

  // Short acronyms (gf, keto) are fine; longer tags need vowels.
  const hasVowel = /[aeiouy]/.test(letters);
  if (!hasVowel && letters.length > 3) return true;

  if (/(.)\1{3,}/.test(letters)) return true;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(letters)) return true;
  if (/(?:qwer|asdf|zxcv|hjkl|yuio)/.test(letters)) return true;

  if (letters.length >= 6) {
    const vowels = (letters.match(/[aeiouy]/g) || []).length;
    if (vowels / letters.length < 0.15) return true;
  }

  const compact = tag.replace(/ /g, "");
  const digits = (compact.match(/\d/g) || []).length;
  if (digits > 0 && digits >= compact.length * 0.5) return true;

  return false;
}

/** Returns an error message, or null if the tag is acceptable. */
export function tagIssue(raw: string): string | null {
  const tag = normalizeTag(raw);
  if (!tag) return "Enter a tag";
  if (tag.length < TAG_MIN_LEN) return "Use at least 2 characters";
  if (tag.length > TAG_MAX_LEN) return "Keep tags under 24 characters";
  if (!TAG_RE.test(tag)) return "Use letters, numbers, spaces, or hyphens";
  if (containsBlockedWord(tag)) return "That tag isn't allowed";
  if (looksLikeGibberish(tag)) return "That doesn't look like a real tag";
  return null;
}

/** True when a tag string is safe to store or filter on. */
export function isValidTag(raw: string): boolean {
  return tagIssue(raw) === null;
}
