const DIFFICULTY_LABELS = ["Easy", "Simple", "Medium", "Tricky", "Showstopper"] as const;

function readyInLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h}hr`;
  if (!m) return hours;
  return `${hours} ${m}min${m === 1 ? "" : "s"}`;
}

function FactIcon({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static recipe fact icons
    <img className="recipe-facts-icon" src={src} alt={alt} width={48} height={48} />
  );
}

export function RecipeFacts({
  difficulty,
  servings,
  totalMinutes,
}: {
  difficulty: number | null;
  servings: string | null;
  totalMinutes: number | null;
}) {
  const servingsText = servings?.trim() || "";
  const difficultyLabel =
    typeof difficulty === "number" && difficulty >= 1 && difficulty <= 5
      ? DIFFICULTY_LABELS[difficulty - 1]
      : null;
  const readyLabel =
    typeof totalMinutes === "number" && totalMinutes > 0 ? readyInLabel(totalMinutes) : null;

  if (!difficultyLabel && !servingsText && !readyLabel) return null;

  return (
    <dl className="recipe-facts" aria-label="Recipe details">
      {difficultyLabel && (
        <div className="recipe-fact">
          <FactIcon src="/images/icons/diff-icon.webp" />
          <dt>Difficulty</dt>
          <dd>{difficultyLabel}</dd>
        </div>
      )}
      {servingsText && (
        <div className="recipe-fact">
          <FactIcon src="/images/icons/serve-icon.webp" />
          <dt>Serves</dt>
          <dd>{servingsText}</dd>
        </div>
      )}
      {readyLabel && (
        <div className="recipe-fact">
          <FactIcon src="/images/icons/time-icon.webp" />
          <dt>Ready in</dt>
          <dd>{readyLabel}</dd>
        </div>
      )}
    </dl>
  );
}
