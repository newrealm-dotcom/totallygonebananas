import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource/shrikhand/latin-400.css";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  DeferredAuthJoinedBeacon,
  DeferredBackToTop,
  DeferredScrollEngagementPopup,
} from "@/components/DeferredChrome";
import { siteUrl } from "@/lib/env";

const site = siteUrl();
const siteDescription =
  "Totally Gone Bananas is a playful banana recipe and banana-culture site with tested recipes, ripeness guides, growing tips, favorite finds, and a community Banana Stand for saving and sharing recipes.";
const defaultOgImage = "/og-image.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Totally Gone Bananas | Banana Recipes & Culture", template: "%s | Totally Gone Bananas" },
  description: siteDescription,
  // Canonical + og:url are set per page so Facebook scrapes the shared URL, not the homepage.
  openGraph: {
    title: "Totally Gone Bananas | Banana Recipes & Culture",
    description: siteDescription,
    type: "website",
    siteName: "Totally Gone Bananas",
    url: site,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Totally Gone Bananas banana recipe and culture site",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Totally Gone Bananas | Banana Recipes & Culture",
    description: siteDescription,
    images: [defaultOgImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF9E6",
};

const GTM_ID = "GTM-5CK4CZ2M";
const CLARITY_PROJECT_ID = (
  process.env.MICROSOFT_CLARITY_PROJECT_ID ??
  process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_PROJECT_ID ??
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ??
  ""
).trim();

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Totally Gone Bananas",
    url: site,
    logo: `${site}/logo.png`,
    sameAs: [
      "https://www.instagram.com/totallygonebananas.official/",
      "https://www.facebook.com/totallygonebananas/",
      "https://www.youtube.com/@TotallyGoneBananas",
      "https://www.pinterest.com/totallygonebananas/",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Totally Gone Bananas",
    url: site,
    description: siteDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site}/recipes?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

const gtmInit = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;

const clarityInit = CLARITY_PROJECT_ID
  ? `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_PROJECT_ID)});`
  : "";

const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

const GROW_FAVES_SITE_ID = "U2l0ZTpjMzIzODNmYi0zM2U4LTQ1YzgtODNhZC1jYzkxOWM1Yzg5M2Y=";
const growInit = `!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","${GROW_FAVES_SITE_ID}");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Totally Gone Bananas" href={`${site}/feed.xml`} />
        <script data-grow-initializer="" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: growInit }} />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* Defer GTM so tag scripts don't compete with LCP / inflate TBT on mobile. */}
        <Script id="gtm-init" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: gtmInit }} />
        {clarityInit ? (
          <Script id="microsoft-clarity" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: clarityInit }} />
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <DeferredScrollEngagementPopup />
        <DeferredAuthJoinedBeacon />
        <DeferredBackToTop />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
