import type { MediaKind } from "@/lib/types";

export const RECIPE_BUCKET = "recipe-media";
export const AVATAR_BUCKET = "avatars";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase's default per-file limit on the free plan

/** Storage paths always look like "<user uuid>/<file name>". */
export const MEDIA_PATH_RE = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;

export function publicUrl(path: string | null | undefined, bucket = RECIPE_BUCKET): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${bucket}/${path}` : null;
}

/** Public site path (`/foo.webp`) or Supabase Storage path → browser URL. */
export function promoImageSrc(path: string | null | undefined): string {
  if (!path) return "/featured-home.webp";
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
  return publicUrl(path, RECIPE_BUCKET) ?? "/featured-home.webp";
}

export function kindOf(file: File): MediaKind | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

/** Returns an error message, or null if the file is acceptable. */
export function checkFile(file: File): string | null {
  const kind = kindOf(file);
  if (!kind) return `${file.name} isn't a supported photo or video. Use JPG, PNG, WebP, MP4, WebM, or MOV.`;
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > max) return `${file.name} is too large. ${kind === "image" ? "Photos" : "Videos"} can be up to ${max / 1024 / 1024} MB.`;
  return null;
}

export function isLocalUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
