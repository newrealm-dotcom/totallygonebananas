import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/shrikhand/latin-400.css";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DeferredBackToTop } from "@/components/DeferredChrome";
import { SignupFloat } from "@/components/SignupFloat";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Totally Gone Bananas", template: "%s | Totally Gone Bananas" },
  description: "Banana recipes for every craving, from green to gone. Save favorites, rate what you cook, and share your own.",
  openGraph: { siteName: "Totally Gone Bananas", images: ["/logo.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF9E6",
};

const GTM_ID = "GTM-5CK4CZ2M";

const gtmInit = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;

const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
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
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <SignupFloat />
        <DeferredBackToTop />
      </body>
    </html>
  );
}
