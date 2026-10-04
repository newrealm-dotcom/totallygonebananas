"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface AdminLink {
  href: string;
  label: string;
  match: (p: string) => boolean;
  badge?: number;
}

export function AdminNav({
  isAdmin,
  pendingReview = 0,
  pendingComments = 0,
  referralsRecent = 0,
}: {
  isAdmin: boolean;
  pendingReview?: number;
  pendingComments?: number;
  referralsRecent?: number;
}) {
  const path = usePathname();
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === path;

  const links = useMemo<AdminLink[]>(
    () => [
      { href: "/admin", label: "Overview", match: (p) => p === "/admin" },
      { href: "/admin/analytics", label: "Analytics", match: (p) => p.startsWith("/admin/analytics") },
      { href: "/admin/homepage", label: "Homepage", match: (p) => p.startsWith("/admin/homepage") },
      { href: "/admin/recipes", label: "Recipes", match: (p) => p.startsWith("/admin/recipes") },
      { href: "/admin/categories", label: "Recipe Categories", match: (p) => p.startsWith("/admin/categories") },
      { href: "/admin/posts", label: "Blog", match: (p) => p.startsWith("/admin/posts") },
      { href: "/admin/blog-categories", label: "Blog Categories", match: (p) => p.startsWith("/admin/blog-categories") },
      { href: "/admin/tags", label: "Tags", match: (p) => p.startsWith("/admin/tags") },
      { href: "/admin/our-faves", label: "Our Faves", match: (p) => p.startsWith("/admin/our-faves") },
      {
        href: "/admin/review",
        label: "Review queue",
        match: (p) => p.startsWith("/admin/review"),
        badge: pendingReview > 0 ? pendingReview : undefined,
      },
      {
        href: "/admin/comments",
        label: "Comments",
        match: (p) => p.startsWith("/admin/comments"),
        badge: pendingComments > 0 ? pendingComments : undefined,
      },
      {
        href: "/admin/referrals",
        label: "Referrals",
        match: (p) => p.startsWith("/admin/referrals"),
        badge: referralsRecent > 0 ? referralsRecent : undefined,
      },
      ...(isAdmin ? [{ href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") }] : []),
    ],
    [isAdmin, pendingReview, pendingComments, referralsRecent],
  );

  const measure = useCallback(() => {
    const nav = navRef.current;
    const strip = measureRef.current;
    if (!nav || !strip) return;

    const available = nav.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(strip).columnGap || getComputedStyle(strip).gap) || 0;
    const itemEls = [...strip.querySelectorAll<HTMLElement>("[data-measure-link]")];
    const moreEl = strip.querySelector<HTMLElement>("[data-measure-more]");
    const moreWidth = moreEl?.offsetWidth ?? 0;
    const widths = itemEls.map((el) => el.offsetWidth);

    const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
    if (total <= available) {
      setVisibleCount(links.length);
      return;
    }

    let used = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const next = used + widths[i] + (i > 0 ? gap : 0);
      const withMore = next + gap + moreWidth;
      if (withMore <= available) {
        used = next;
        count = i + 1;
      } else {
        break;
      }
    }
    setVisibleCount(Math.max(1, count));
  }, [links]);

  useLayoutEffect(() => {
    measure();
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      setOpenForPath(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenForPath(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = visibleCount ?? links.length;
  const primary = links.slice(0, shown);
  const overflow = links.slice(shown);
  const overflowActive = overflow.some((l) => l.match(path));

  function linkLabel(l: AdminLink) {
    return (
      <>
        {l.label}
        {l.badge != null ? (
          <span className="admin-nav-badge" aria-label={`${l.badge} new`}>
            {l.badge}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <nav className="admin-nav" aria-label="Admin" ref={navRef}>
      <div className="admin-nav-measure" ref={measureRef} aria-hidden="true">
        {links.map((l) => (
          <span key={l.href} className="admin-nav-link" data-measure-link>
            {linkLabel(l)}
          </span>
        ))}
        <span className="admin-nav-more-btn" data-measure-more>
          More
          {pendingReview > 0 || pendingComments > 0 || referralsRecent > 0 ? (
            <span className="admin-nav-badge" aria-hidden="true">
              9
            </span>
          ) : null}
        </span>
      </div>

      {primary.map((l) => (
        <Link key={l.href} href={l.href} className="admin-nav-link" aria-current={l.match(path) ? "page" : undefined}>
          {linkLabel(l)}
        </Link>
      ))}

      {overflow.length > 0 && (
        <div className="admin-nav-more" ref={menuRef}>
          <button
            type="button"
            className="admin-nav-more-btn"
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="menu"
            aria-current={overflowActive ? "true" : undefined}
            onClick={() => setOpenForPath(open ? null : path)}
          >
            More
            {overflow.some((l) => l.badge) ? (
              <span className="admin-nav-badge" aria-label="Items need attention">
                {overflow.reduce((sum, l) => sum + (l.badge ?? 0), 0)}
              </span>
            ) : null}
            <span aria-hidden="true">{open ? "▴" : "▾"}</span>
          </button>
          {open && (
            <ul id={menuId} className="admin-nav-menu" role="menu">
              {overflow.map((l) => (
                <li key={l.href} role="none">
                  <Link
                    href={l.href}
                    role="menuitem"
                    aria-current={l.match(path) ? "page" : undefined}
                    onClick={() => setOpenForPath(null)}
                  >
                    {linkLabel(l)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </nav>
  );
}
