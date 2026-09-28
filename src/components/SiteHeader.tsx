import Image from "next/image";
import Link from "next/link";
import { getViewer, getViewerStandings } from "@/lib/queries";
import { publicUrl, AVATAR_BUCKET } from "@/lib/media";
import { NavLinks } from "@/components/NavLinks";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";

export async function SiteHeader() {
  const [{ userId, profile }, standings] = await Promise.all([getViewer(), getViewerStandings()]);
  const avatar = publicUrl(profile?.avatar_path, AVATAR_BUCKET);
  const name = profile?.display_name || "You";
  return (
    <header className="top">
      <div className="wrap">
        <NavLinks side="left" />
        <BrandLogo />
        <div className="top-end">
          <NavLinks side="right" />
          <div className="top-right">
            <ThemeToggle />
            <MobileNav />
            <div className="top-actions">
              {userId ? (
                <>
                  <Link className="btn small" href="/recipes/new">Add a recipe</Link>
                  <div className="profile-menu">
                    <Link
                      className="avatar-link"
                      href="/profile"
                      aria-label={`Your profile, ${name}${standings ? `, ${standings.name}, ${standings.points} points` : ""}`}
                    >
                      {avatar ? <Image src={avatar} alt="" width={40} height={40} unoptimized /> : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
                    </Link>
                    <div className="profile-chip-meta">
                      {standings && (
                        <Link className="profile-chip-stats" href="/profile">
                          <strong>{standings.name}</strong>
                          <span>{standings.points} pts</span>
                        </Link>
                      )}
                      <form action="/auth/signout" method="post">
                        <button type="submit" className="profile-logout">Log out</button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <Link className="btn small ghost" href="/login">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
