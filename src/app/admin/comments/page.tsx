import type { Metadata } from "next";
import Link from "next/link";
import { listPendingPostComments } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { CommentReviewButtons } from "@/components/CommentReviewButtons";

export const metadata: Metadata = { title: "Admin · Comments" };

export default async function AdminCommentsPage() {
  const pending = await listPendingPostComments();

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Comments</h2>
          <p>
            {pending.length
              ? `${pending.length} comment${pending.length === 1 ? "" : "s"} waiting for approval.`
              : "All caught up. No comments are waiting."}
          </p>
        </div>
      </div>
      <ul className="rows">
        {pending.map((c) => (
          <li key={c.id} className="row review-row">
            <div>
              <h3>
                {c.post?.slug ? (
                  <Link href={`/blog/${c.post.slug}`}>{c.post.title}</Link>
                ) : (
                  c.post?.title || "Untitled post"
                )}
              </h3>
              <p>
                From {c.display_name} on {shortDate(c.created_at)}
              </p>
              <p className="admin-comment-body">{c.body}</p>
            </div>
            <CommentReviewButtons commentId={c.id} />
          </li>
        ))}
      </ul>
    </>
  );
}
