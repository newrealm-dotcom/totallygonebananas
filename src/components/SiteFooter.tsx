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

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
      />
    </svg>
  );
}

function PatreonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M15.4 3.1a6.9 6.9 0 1 0 .1 13.8 6.9 6.9 0 0 0-.1-13.8zM2 21V3.1h3.5V21H2z"
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
              <a
                href="https://www.patreon.com/TotallyGoneBananas/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on Patreon"
              >
                <PatreonIcon />
              </a>
              <a
                href="https://open.spotify.com/show/7z5KxVvy3bUH3hqvbloNl0?si=-_stzhQhQjyH8AtujHqpRg&nd=1&dlsi=4a46fea448f04c42"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on Spotify"
              >
                <SpotifyIcon />
              </a>
              <a
                href="https://x.com/TotsGoneBananas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Totally Gone Bananas on Twitter"
              >
                <TwitterIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
