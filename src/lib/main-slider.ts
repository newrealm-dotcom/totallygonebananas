import { readdir } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";

const IMAGE_EXT = /\.(webp|png|jpe?g|gif|avif)$/i;

async function listSliderImages(subdir: string, urlPrefix: string): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "main-slider", subdir);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name) && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((file) => `${urlPrefix}/${file}`);
  } catch {
    return [];
  }
}

/** Images in /public/main-slider (top level only — not /dark). Auto-includes new files. */
export async function getMainSliderImages(): Promise<string[]> {
  noStore();
  return listSliderImages("", "/main-slider");
}

/** Images in /public/main-slider/dark. Auto-includes new files. */
export async function getDarkMainSliderImages(): Promise<string[]> {
  noStore();
  return listSliderImages("dark", "/main-slider/dark");
}

/** Pick one path at random for this request (changes on refresh). */
export function pickRandomSlide(slides: string[]): string | null {
  if (!slides.length) return null;
  return slides[Math.floor(Math.random() * slides.length)] ?? null;
}

const IN_THE_WILD_SLIDES = [
  "/images/inthewild-01.webp",
  "/images/inthewild-02.webp",
  "/images/inthewild-03.webp",
  "/images/inthewild-04.webp",
];

/** Blog archive hero images in /public/images/inthewild-*.webp. */
export async function getInTheWildImages(): Promise<string[]> {
  noStore();
  const dir = path.join(process.cwd(), "public", "images");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const found = entries
      .filter((entry) => entry.isFile() && /^inthewild-.*\.(webp|png|jpe?g|gif|avif)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((file) => `/images/${file}`);
    return found.length ? found : IN_THE_WILD_SLIDES;
  } catch {
    return IN_THE_WILD_SLIDES;
  }
}
