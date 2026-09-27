"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
    { href: "/admin/homepage", label: "Homepage", match: (p: string) => p.startsWith("/admin/homepage") },
    { href: "/admin/recipes", label: "Recipes", match: (p: string) => p.startsWith("/admin/recipes") },
    { href: "/admin/posts", label: "Blog", match: (p: string) => p.startsWith("/admin/posts") },
    { href: "/admin/categories", label: "Categories", match: (p: string) => p.startsWith("/admin/categories") },
    { href: "/admin/review", label: "Review queue", match: (p: string) => p.startsWith("/admin/review") },
    { href: "/admin/referrals", label: "Referrals", match: (p: string) => p.startsWith("/admin/referrals") },
    ...(isAdmin ? [{ href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") }] : []),
  ];

  return (
    <nav className="admin-nav" aria-label="Admin">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
