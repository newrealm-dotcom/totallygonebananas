import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  DeferredAuthJoinedBeacon,
  DeferredBackToTop,
  DeferredScrollEngagementPopup,
} from "@/components/DeferredChrome";
import { siteUrl } from "@/lib/env";

const shrikhand = localFont({
  src: "../../node_modules/@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-shrikhand",
  adjustFontFallback: false,
});

const nunito = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
      weight: "200 1000",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-ext-wght-normal.woff2",
      weight: "200 1000",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-nunito",
  adjustFontFallback: false,
});

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
/** Delay Grow until idle/interaction so lab TBT and Best Practices stay clean. Real visitors still get Faves. */
const growInit = `(function(){
  var id=${JSON.stringify(GROW_FAVES_SITE_ID)};
  var LEFT="max(1rem, env(safe-area-inset-left, 0px))";
  function pin(root){
    var sr=root&&root.shadowRoot;
    if(!sr)return false;
    var nodes=sr.querySelectorAll("div");
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(getComputedStyle(el).position!=="fixed")continue;
      if(el.style.getPropertyValue("left")===LEFT&&el.style.getPropertyPriority("left")==="important")continue;
      el.style.setProperty("left",LEFT,"important");
      el.style.setProperty("right","auto","important");
    }
    if(!sr.__tgbPin){
      sr.__tgbPin=1;
      new MutationObserver(function(){pin(root);}).observe(sr,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
    }
    return true;
  }
  function watch(){
    var root=document.getElementById("grow-me-root");
    if(!root||root.__tgbWatch)return;
    root.__tgbWatch=1;
    if(pin(root))return;
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(pin(root)||tries>40)clearInterval(timer);
    },250);
  }
  new MutationObserver(watch).observe(document.documentElement,{childList:true,subtree:true});
  function inject(){
    if(window.__tgbGrow)return;
    window.__tgbGrow=1;
    window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));
    var e=document.createElement("script");
    e.src="https://faves.grow.me/main.js";
    e.defer=!0;
    e.setAttribute("data-grow-faves-site-id",id);
    document.head.appendChild(e);
  }
  function arm(){
    var done=0;
    function run(){if(done)return;done=1;inject();}
    ["scroll","pointerdown","keydown","touchstart"].forEach(function(t){
      window.addEventListener(t,run,{once:!0,passive:!0});
    });
    setTimeout(run,5500);
  }
  if(document.readyState==="complete")arm();
  else window.addEventListener("load",arm);
  watch();
})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${shrikhand.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="alternate" type="application/rss+xml" title="Totally Gone Bananas" href={`${site}/feed.xml`} />
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
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* Defer GTM so tag scripts don't compete with LCP / inflate TBT on mobile. */}
        <Script id="gtm-init" strategy="lazyOnload" nonce={nonce} dangerouslySetInnerHTML={{ __html: gtmInit }} />
        {clarityInit ? (
          <Script id="microsoft-clarity" strategy="lazyOnload" nonce={nonce} dangerouslySetInnerHTML={{ __html: clarityInit }} />
        ) : null}
        {/* Grow Faves is not in the script allowlist, so this loader stays without a nonce and CSP blocks it. */}
        <Script id="grow-faves" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: growInit }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
