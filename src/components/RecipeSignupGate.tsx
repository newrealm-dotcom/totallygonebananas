import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { RecipePreviewGateBeacon } from "@/components/RecipePreviewGateBeacon";

export function RecipeSignupGate({
  title,
  slug,
  googleEnabled,
}: {
  title: string;
  slug: string;
  googleEnabled: boolean;
}) {
  return (
    <div className="wrap narrow recipe-gate">
      <RecipePreviewGateBeacon slug={slug} />
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
