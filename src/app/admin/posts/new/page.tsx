import type { Metadata } from "next";
import { PostForm } from "@/components/PostForm";

export const metadata: Metadata = { title: "Admin · New post" };

export default function NewPostPage() {
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>New blog post</h2>
          <p>Fill in the post details, then optionally upload JSON for the document head.</p>
        </div>
      </div>
      <PostForm />
    </>
  );
}
