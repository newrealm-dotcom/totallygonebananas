"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { SocialIcons } from "@/components/SocialIcons";

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/recipes", label: "Recipes", match: (p: string) => p.startsWith("/recipes") && p !== "/recipes/new" },
  { href: "/blog", label: "Blog", match: (p: string) => p.startsWith("/blog") },
  { href: "/our-faves", label: "Our Faves", match: (p: string) => p.startsWith("/our-faves") },
  { href: "/profile", label: "My Banana Stand", match: (p: string) => p.startsWith("/profile") },
  {
    href: "https://store.totallygonebananas.com/",
    label: "Merch",
    match: () => false,
    external: true,
  },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
  { href: "/policy", label: "Privacy Policy", match: (p: string) => p === "/policy" },
] as const;

/** Site hamburger menu — left on desktop, in the mobile tools stack on small screens. */
export function MobileNav({
  signedIn = false,
  authLabel = "Sign Up",
}: {
  signedIn?: boolean;
  authLabel?: string;
}) {
  const path = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [openForPath, setOpenForPath] = useState(path);

  if (openForPath !== path) {
    setOpenForPath(path);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className={`mobile-nav${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="hamburger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hamburger-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      {open ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close menu"
          onClick={close}
        />
      ) : null}
      <div id={panelId} className="mobile-nav-panel" hidden={!open}>
        <nav className="mobile-nav-links" aria-label="Site">
          {LINKS.map((l) =>
            "external" in l && l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.match(path) ? "page" : undefined}
                onClick={close}
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <SocialIcons className="mobile-nav-social" onNavigate={close} />

        <div className="mobile-nav-actions">
          {!signedIn ? (
            <Link className="btn" href="/login" onClick={close}>
              {authLabel}
            </Link>
          ) : null}
          <Link className="btn ghost" href="/recipes/new" onClick={close}>
            Add a recipe
          </Link>
        </div>
      </div>
    </div>
  );
}
