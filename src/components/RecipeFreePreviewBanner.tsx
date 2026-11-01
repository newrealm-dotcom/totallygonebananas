import Link from "next/link";

/** One-line notice on the anonymous free recipe view. */
export function RecipeFreePreviewBanner() {
  return (
    <p className="notice-inline recipe-free-preview" role="status">
      <span>
        This is your free recipe preview.{" "}
        <Link href="/login?intent=recipe">Join free</Link> to open every other recipe.
      </span>
    </p>
  );
}
