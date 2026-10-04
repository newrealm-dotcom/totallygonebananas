import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { mediaSrc } from "@/lib/media";
import { siteUrl } from "@/lib/env";

const WIDTH = 1080;
/** Instagram rejects feed images outside 4:5 (portrait) to 1.91:1 (landscape). */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

/** Published cover image as an Instagram-ready JPEG: /api/social-image/recipe/<slug>.jpg */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  const slug = file.replace(/\.jpe?g$/i, "");
  const table = kind === "recipe" ? "recipes" : kind === "post" ? "posts" : null;
  if (!table || !/^[a-z0-9-]{1,120}$/.test(slug)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from(table).select("cover_path").eq("slug", slug).eq("status", "published").maybeSingle();
  const src = mediaSrc(data?.cover_path);
  if (!src) return new Response("Not found", { status: 404 });

  const source = await fetch(src.startsWith("/") ? `${siteUrl()}${src}` : src, { cache: "no-store" });
  if (!source.ok) return new Response("Cover unavailable", { status: 502 });

  const image = sharp(Buffer.from(await source.arrayBuffer())).rotate();
  const { width = WIDTH, height = WIDTH } = await image.metadata();
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height));
  const jpeg = await image
    .resize({ width: WIDTH, height: Math.round(WIDTH / ratio), fit: "cover", position: "attention" })
    .flatten({ background: "#FBF9E6" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
