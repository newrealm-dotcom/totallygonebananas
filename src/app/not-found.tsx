import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap not-found-page">
      <div className="not-found">
        <div className="not-found-copy">
          <h1 className="h1">This page slipped on a peel</h1>
          <h5 className="not-found-status">Page not found</h5>
          <p className="not-found-message">
            The page you were looking for does not exist or has moved.
          </p>
          <p className="not-found-actions">
            <Link className="btn" href="/">
              Back to the homepage
            </Link>
          </p>
        </div>
        <div className="not-found-art">
          <Image
            src="/images/stop.png"
            alt=""
            width={1254}
            height={1254}
            sizes="(max-width: 900px) min(360px, 70vw), min(460px, 38vw)"
            priority
          />
        </div>
      </div>
    </div>
  );
}
