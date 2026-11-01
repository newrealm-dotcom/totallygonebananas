/** Shared site navigation — one source of truth for desktop and mobile. */

export const SPOTIFY_SHOW_URL =
  "https://open.spotify.com/show/7z5KxVvy3bUH3hqvbloNl0?si=-_stzhQhQjyH8AtujHqpRg&nd=1&dlsi=4a46fea448f04c42";

export interface NavLinkItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  external?: boolean;
}

/** Top-level primary links (desktop left nav + mobile). */
export const PRIMARY_NAV: NavLinkItem[] = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/recipes", label: "Recipes", match: (p) => p.startsWith("/recipes") && p !== "/recipes/new" },
  { href: "/blog", label: "Blog", match: (p) => p.startsWith("/blog") },
  {
    href: "https://store.totallygonebananas.com/",
    label: "Merch",
    match: () => false,
    external: true,
  },
];

/** Nested under Blog on desktop; listed after Blog on mobile. */
export const BLOG_SUBNAV: NavLinkItem[] = [
  { href: "/our-faves", label: "Our Faves", match: (p) => p.startsWith("/our-faves") },
];

/** Nested under More Info on desktop; listed after Merch on mobile. */
export const MORE_INFO_NAV: NavLinkItem[] = [
  { href: "/about", label: "About", match: (p) => p === "/about" },
  { href: "/banana-growing-zones", label: "Grow Zones", match: (p) => p === "/banana-growing-zones" },
];

/** Account / profile — mobile drawer only (desktop uses avatar menu). */
export const ACCOUNT_NAV: NavLinkItem[] = [
  { href: "/profile", label: "My Banana Stand", match: (p) => p.startsWith("/profile") },
];

/**
 * Flat mobile order mirrors desktop IA:
 * primary → blog children → more info → account.
 */
export function mobileNavLinks(): NavLinkItem[] {
  const withoutHomeDup = PRIMARY_NAV;
  return [...withoutHomeDup, ...BLOG_SUBNAV, ...MORE_INFO_NAV, ...ACCOUNT_NAV];
}
