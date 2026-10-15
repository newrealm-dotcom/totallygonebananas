"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEFT = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/recipes", label: "Recipes", match: (p: string) => p.startsWith("/recipes") && p !== "/recipes/new" },
  { href: "/blog", label: "Blog", match: (p: string) => p.startsWith("/blog") },
  { href: "/our-faves", label: "Our Faves", match: (p: string) => p.startsWith("/our-faves") },
  {
    href: "https://store.totallygonebananas.com/",
    label: "Merch",
    match: () => false,
    external: true,
  },
];

const RIGHT = [
  { href: "/profile", label: "My Banana Stand", match: (p: string) => p.startsWith("/profile") },
  {
    href: "https://store.totallygonebananas.com/",
    label: "Merch",
    match: () => false,
    external: true,
  },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
];

const MORE_INFO = [
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
  { href: "/contact", label: "Contact", match: (p: string) => p === "/contact" },
  { href: "/banana-growing-zones", label: "Grow Zones", match: (p: string) => p === "/banana-growing-zones" },
] as const;

export function NavLinks({
  side,
  includeHome = true,
  className = "",
}: {
  side: "left" | "right";
  includeHome?: boolean;
  className?: string;
}) {
  const path = usePathname();
  const links = (side === "left" ? LEFT : RIGHT).filter((l) => includeHome || l.href !== "/");

  return (
    <nav className={`main ${side}${className ? ` ${className}` : ""}`} aria-label={side === "left" ? "Main" : "Account"}>
      {links.map((l) =>
        "external" in l && l.external ? (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ) : (
          <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
            {l.label}
          </Link>
        ),
      )}
      {side === "left" ? (
        <details className="top-more" data-active={MORE_INFO.some((l) => l.match(path)) ? "true" : undefined}>
          <summary className="top-more-summary">
            More Info <span className="top-more-arrow" aria-hidden="true" />
          </summary>
          <div className="top-more-menu">
            {MORE_INFO.map((l) => (
              <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </nav>
  );
}
