import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { HAS_ACCOUNT_COOKIE } from "@/lib/auth-next";
import { getViewer, getViewerStandings } from "@/lib/queries";
import { publicUrl, AVATAR_BUCKET } from "@/lib/media";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";

export async function SiteHeader() {
  const [{ userId, profile }, standings, jar] = await Promise.all([
    getViewer(),
    getViewerStandings(),
    cookies(),
  ]);
  const avatar = publicUrl(profile?.avatar_path, AVATAR_BUCKET);
  const name = profile?.display_name || "You";
  const hasAccount = jar.get(HAS_ACCOUNT_COOKIE)?.value === "1";
  const authLabel = hasAccount || userId ? "Sign In" : "Sign Up";

  return (
    <header className="top">
      <div className="wrap">
        <BrandLogo />

        <div className="top-end">
          <div className="top-right">
            <ThemeToggle />
            <MobileNav signedIn={Boolean(userId)} authLabel={authLabel} />
            <div className="top-actions">
              {userId ? (
                <div className="profile-menu">
                  <Link
                    className="avatar-link"
                    href="/profile"
                    aria-label={`Your profile, ${name}${standings ? `, ${standings.name}, ${standings.points} points` : ""}`}
                  >
                    {avatar ? (
                      <Image src={avatar} alt="" width={40} height={40} unoptimized />
                    ) : (
                      <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </Link>
                  <div className="profile-chip-meta">
                    {standings && (
                      <Link className="profile-chip-stats" href="/profile">
                        <strong>{standings.name}</strong>
                        <span>{standings.points} pts</span>
                      </Link>
                    )}
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="profile-logout">
                        Log out
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
              <Link className="btn small top-add-recipe" href="/recipes/new">
                Add a recipe
              </Link>
              {!userId ? (
                <Link className="btn small ghost" href="/login">
                  {authLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
