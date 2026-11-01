import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { MediaView } from "@/components/MediaView";
import { RecipePreviewGateBeacon } from "@/components/RecipePreviewGateBeacon";

export function RecipeSignupGate({
  title,
  slug,
  coverPath,
  googleEnabled,
}: {
  title: string;
  slug: string;
  /** Published cover stays visible; only the recipe body stays behind the gate. */
  coverPath?: string | null;
  googleEnabled: boolean;
}) {
  return (
    <div className="wrap narrow recipe-gate">
      <RecipePreviewGateBeacon slug={slug} />
      {coverPath ? (
        <div className="recipe-gate-art" aria-hidden="true">
          <MediaView path={coverPath} alt="" sizes="(max-width: 640px) 100vw, 560px" priority />
        </div>
      ) : null}
      <div className="page-head">
        <h1>Sign up free to read more recipes</h1>
        <p className="lede">
          You can open one recipe without an account. Create a free Banana Stand to read <b>{title}</b> and every
          other recipe on the site.
        </p>
      </div>
      <LoginForm next={`/recipes/${slug}`} googleEnabled={googleEnabled} intent="recipe" />
      <p className="recipe-gate-back">
        <Link href="/recipes">Back to all recipes</Link>
      </p>
    </div>
  );
}
