"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { mobileNavLinks, SPOTIFY_SHOW_URL } from "@/lib/nav";

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

/** Site hamburger menu — left on desktop, in the mobile tools stack on small screens. */
export function MobileNav({
  signedIn = false,
  authLabel = "Sign in",
  authHref = "/login",
}: {
  signedIn?: boolean;
  authLabel?: string;
  authHref?: string;
}) {
  const path = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [openForPath, setOpenForPath] = useState(path);
  const links = mobileNavLinks();

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
          {links.map((l) =>
            l.external ? (
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

        <div className="mobile-nav-actions">
          {!signedIn ? (
            <Link className="btn ghost" href={authHref} onClick={close}>
              {authLabel}
            </Link>
          ) : null}
          <Link className="btn" href="/recipes/new" onClick={close}>
            Add a recipe
          </Link>
          <a className="btn listen-now mobile-listen-now" href={SPOTIFY_SHOW_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
            <MicIcon />
            Listen Now
          </a>
        </div>
      </div>
    </div>
  );
}
