import Image from "next/image";
import { Mascot } from "@/components/Mascot";

/** Light-mode slide from /main-slider; dark-mode slide from /main-slider/dark. SVG fallback if empty. */
export function HeroSlide({
  lightSrc,
  darkSrc,
  alt = "The Totally Gone Bananas mascot",
  sizes = "(max-width: 900px) 320px, 46vw",
}: {
  lightSrc: string | null;
  darkSrc: string | null;
  alt?: string;
  sizes?: string;
}) {
  const light = lightSrc ?? darkSrc;
  const dark = darkSrc ?? lightSrc;
  if (!light && !dark) return <Mascot />;

  // Same asset for both themes — one image is enough.
  if (!light || !dark || light === dark) {
    return (
      <Image
        className="mascot hero-slide"
        src={(light ?? dark)!}
        alt={alt}
        width={920}
        height={520}
        priority
        sizes={sizes}
      />
    );
  }

  return (
    <div className="hero-slide-stack">
      <Image
        className="mascot hero-slide hero-slide-light"
        src={light}
        alt={alt}
        width={920}
        height={520}
        priority
        sizes={sizes}
      />
      <Image
        className="mascot hero-slide hero-slide-dark"
        src={dark}
        alt={alt}
        width={920}
        height={520}
        priority
        sizes={sizes}
      />
    </div>
  );
}
