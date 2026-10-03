import Image from "next/image";
import Link from "next/link";
import { FooterPeekImage } from "@/components/FooterPeekImage";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.5c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5v1.8H16l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <FooterPeekImage />
      <div className="footer-surface">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-copy">
              <Image
                className="footer-brand-mark"
                src="/logo.png"
                alt=""
                width={150}
                height={162}
                sizes="150px"
              />
              <p className="footer-name">Totally Gone Bananas</p>
              <p className="footer-tagline">Recipes for every banana, from green to gone.</p>
            </div>
          </div>

          <nav aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/recipes">Recipes</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/our-faves">Our Faves</Link>
            <Link href="/recipes/new">Share a recipe</Link>
            <Link href="/profile">My Banana Stand</Link>
            <a href="https://store.totallygonebananas.com/" target="_blank" rel="noopener noreferrer">
              Merch
            </a>
            <Link href="/about">About</Link>
          </nav>

          <Link className="footer-header-logo" href="/" aria-label="Totally Gone Bananas home">
            <Image
              className="footer-header-logo-light"
              src="/img-login.webp"
              alt=""
              width={186}
              height={124}
              sizes="186px"
            />
            <Image
              className="footer-header-logo-dark"
              src="/img-login-dark.webp"
              alt=""
              width={186}
              height={124}
              sizes="186px"
            />
          </Link>

          <div className="footer-aside">
            <p className="footer-aside-label">Follow along</p>
            <div className="footer-social">
              <a
                href="https://www.instagram.com/totallygonebananas.official/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://www.facebook.com/totallygonebananas/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on Facebook"
              >
                <FacebookIcon />
              </a>
              <a
                href="https://www.youtube.com/@TotallyGoneBananas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on YouTube"
              >
                <YouTubeIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
