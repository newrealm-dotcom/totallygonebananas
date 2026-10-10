import type { Metadata } from "next";
import Link from "next/link";
import { countPosts, getViewer, isAdminRole, listPosts } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { AdminBulkList } from "@/components/AdminBulkList";

export const metadata: Metadata = { title: "Admin · Our Faves" };

const FAVORITES_CATEGORY = "favorites";
const PAGE_SIZE = 10;

export default async function AdminOurFavesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawPage = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const filters = { category: FAVORITES_CATEGORY };
  const [{ profile }, total] = await Promise.all([
    getViewer(),
    countPosts(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const offset = (current - 1) * PAGE_SIZE;
  const posts = await listPosts({ ...filters, limit: PAGE_SIZE, offset, draftsFirst: true });
  const admin = isAdminRole(profile);

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Our Faves</h2>
          <p>
            Hand-picked favorites that appear on /our-faves.
            {admin ? " Select one or many to edit status, clone, or delete." : ""}
          </p>
        </div>
        <Link className="btn small" href="/admin/our-faves/new">New fave</Link>
      </div>
      {total === 0 ? (
        <div className="empty">
          <p>No favorites yet.</p>
          <Link className="btn" href="/admin/our-faves/new">Add the first one</Link>
        </div>
      ) : (
        <>
          <AdminBulkList
            kind="post"
            isAdmin={admin}
            items={posts.map((p) => ({
              id: p.id,
              name: p.title,
              editHref: `/admin/posts/${p.id}/edit`,
              viewHref: p.status === "published" ? `/blog/${p.slug}` : undefined,
              status: p.status,
              detail: p.published_at ? `published ${shortDate(p.published_at)}` : `updated ${shortDate(p.updated_at)}`,
              imageSrc: mediaSrc(p.cover_path),
            }))}
          />
          {totalPages > 1 && (
            <nav className="admin-pager" aria-label="Our Faves pages">
              {current > 1 ? (
                <Link
                  className="btn small ghost"
                  href={current === 2 ? "/admin/our-faves" : `/admin/our-faves?page=${current - 1}`}
                >
                  Previous
                </Link>
              ) : (
                <span className="btn small ghost" aria-disabled="true">Previous</span>
              )}
              <span className="admin-pager-status">
                Page {current} of {totalPages}
              </span>
              {current < totalPages ? (
                <Link className="btn small ghost" href={`/admin/our-faves?page=${current + 1}`}>
                  Next
                </Link>
              ) : (
                <span className="btn small ghost" aria-disabled="true">Next</span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
