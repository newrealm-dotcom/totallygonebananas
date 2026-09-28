import type { Metadata } from "next";
import Link from "next/link";
import { adminCounts } from "@/lib/queries";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const counts = await adminCounts();

  return (
    <>
      <ul className="admin-stats">
        <li className="stat"><b>{counts.recipes}</b><span>Recipes</span></li>
        <li className="stat"><b>{counts.pending}</b><span>Pending review</span></li>
        <li className="stat"><b>{counts.posts}</b><span>Blog posts</span></li>
        <li className="stat"><b>{counts.categories}</b><span>Recipe categories</span></li>
        <li className="stat"><b>{counts.blogCategories}</b><span>Blog categories</span></li>
        <li className="stat"><b>{counts.profiles}</b><span>Members</span></li>
      </ul>
      <div className="admin-actions">
        <Link className="btn" href="/recipes/new">New recipe</Link>
        <Link className="btn ghost" href="/admin/posts/new">New blog post</Link>
        <Link className="btn ghost" href="/admin/homepage">Edit homepage promo</Link>
        <Link className="btn ghost" href="/admin/categories">Recipe categories</Link>
        <Link className="btn ghost" href="/admin/blog-categories">Blog categories</Link>
        <Link className="btn ghost" href="/admin/referrals">View referrals</Link>
        {counts.pending > 0 && <Link className="btn dark" href="/admin/review">Review {counts.pending} pending</Link>}
      </div>
    </>
  );
}
