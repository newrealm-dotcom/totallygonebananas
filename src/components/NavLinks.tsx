"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEFT = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/recipes", label: "Recipes", match: (p: string) => p.startsWith("/recipes") && p !== "/recipes/new" },
  { href: "/blog", label: "Blog", match: (p: string) => p.startsWith("/blog") },
  { href: "/our-faves", label: "Our Faves", match: (p: string) => p.startsWith("/our-faves") },
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

export function NavLinks({ side }: { side: "left" | "right" }) {
  const path = usePathname();
  const links = side === "left" ? LEFT : RIGHT;

  return (
    <nav className={`main ${side}`} aria-label={side === "left" ? "Main" : "Account"}>
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
    </nav>
  );
}
