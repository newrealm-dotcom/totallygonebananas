import Image from "next/image";
import { isLocalUrl, publicUrl } from "@/lib/media";
import type { MediaKind } from "@/lib/types";

/** Shows an uploaded photo (optimized) or video from Storage. Parent must be position: relative for `fill`. */
export function MediaView({ path, kind = "image", alt, sizes = "(max-width: 700px) 100vw, 50vw", priority = false }: { path: string; kind?: MediaKind; alt: string; sizes?: string; priority?: boolean }) {
  const src = publicUrl(path);
  if (!src) return null;
  if (kind === "video") {
    return <video className="media-fill" src={src} controls playsInline preload="metadata" aria-label={alt} />;
  }
  return (
    <Image
      className="media-fill"
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/") || isLocalUrl(src)}
    />
  );
}
