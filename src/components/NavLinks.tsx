"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const LEFT = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/recipes", label: "Recipes", match: (p: string) => p.startsWith("/recipes") && p !== "/recipes/new" },
  { href: "/blog", label: "Blog", match: (p: string) => p.startsWith("/blog") },
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
  { href: "/banana-growing-zones", label: "Grow Zones", match: (p: string) => p === "/banana-growing-zones" },
] as const;

const BLOG_MENU = [
  { href: "/our-faves", label: "Our Faves", match: (p: string) => p.startsWith("/our-faves") },
] as const;

const SPOTIFY_SHOW_URL =
  "https://open.spotify.com/show/7z5KxVvy3bUH3hqvbloNl0?si=-_stzhQhQjyH8AtujHqpRg&nd=1&dlsi=4a46fea448f04c42";

function MicIcon() {
  return (
    <svg className="listen-now-mic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2Z"
      />
    </svg>
  );
}

function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return { open, setOpen, openMenu, closeMenu };
}

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
  const more = useHoverMenu();
  const blog = useHoverMenu();

  return (
    <nav className={`main ${side}${className ? ` ${className}` : ""}`} aria-label={side === "left" ? "Main" : "Account"}>
      {links.map((l) =>
        "external" in l && l.external ? (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ) : l.href === "/blog" ? (
          <div
            key={l.href}
            className="top-blog-menu"
            data-open={blog.open ? "true" : undefined}
            onMouseEnter={blog.openMenu}
            onMouseLeave={blog.closeMenu}
            onFocus={blog.openMenu}
            onBlur={(e) => {
              if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) blog.setOpen(false);
            }}
          >
            <Link className="top-blog-link" href={l.href} aria-current={l.match(path) ? "page" : undefined}>
              {l.label} <span className="top-more-arrow" aria-hidden="true" />
            </Link>
            <div className="top-blog-submenu">
              {BLOG_MENU.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.match(path) ? "page" : undefined}
                  onClick={() => blog.setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
            {l.label}
          </Link>
        ),
      )}
      {side === "left" ? (
        <details
          className="top-more"
          data-active={MORE_INFO.some((l) => l.match(path)) ? "true" : undefined}
          open={more.open}
          onMouseEnter={more.openMenu}
          onMouseLeave={more.closeMenu}
          onFocus={more.openMenu}
          onToggle={(e) => more.setOpen(e.currentTarget.open)}
          onBlur={(e) => {
            if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) more.setOpen(false);
          }}
        >
          <summary className="top-more-summary">
            More Info <span className="top-more-arrow" aria-hidden="true" />
          </summary>
          <div className="top-more-menu">
            {MORE_INFO.map((l) => (
              <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined} onClick={() => more.setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
      {side === "left" ? (
        <a className="btn small listen-now" href={SPOTIFY_SHOW_URL} target="_blank" rel="noopener noreferrer">
          <MicIcon />
          Listen Now
        </a>
      ) : null}
    </nav>
  );
}
