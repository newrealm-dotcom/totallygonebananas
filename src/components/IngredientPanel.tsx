import { parseServingCount } from "@/lib/format";
import type { IngredientGroup, IngredientItem } from "@/lib/ingredients";
import { IngredientQty } from "@/components/IngredientQty";
import { IngredientScaleControls } from "@/components/IngredientScaleControls";

function IngredientText({ item }: { item: IngredientItem }) {
  const body = <IngredientQty text={item.text} />;
  if (!item.url) return body;
  return (
    <a className="ing-link" href={item.url} target="_blank" rel="noopener noreferrer">
      {body}
      <span className="sr"> (opens in a new window)</span>
    </a>
  );
}

/**
 * Ingredients panel: list markup is a Server Component (in the raw HTML).
 * Scale controls and quantity tweaks hydrate as small client islands.
 */
export function IngredientPanel({
  ingredients,
  servings,
}: {
  ingredients: IngredientGroup[];
  servings: string | number | null;
}) {
  const baseServings = parseServingCount(servings);
  const groups = ingredients.length ? ingredients : [{ title: "", items: [] as IngredientItem[] }];
  const hasLink = groups.some((g) => g.items.some((item) => item.url));

  return (
    <aside className="panel ing-panel" aria-labelledby="ing-title">
      <h2 id="ing-title">Ingredients</h2>
      <p>
        Tick things off as you shop or cook.
        {hasLink ? " Linked ingredients open in a new window." : ""}
      </p>
      <IngredientScaleControls baseServings={baseServings} />
      {groups.map((group, gi) => (
        <div key={gi} className="ing-group">
          {group.title ? <h3 className="ing-group-title">{group.title}</h3> : null}
          <ol className="checks">
            {group.items.map((item, i) => (
              <li key={`${gi}-${i}`}>
                <label>
                  <input type="checkbox" />
                  <IngredientText item={item} />
                </label>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </aside>
  );
}
