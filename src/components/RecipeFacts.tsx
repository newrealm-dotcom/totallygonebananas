const DIFFICULTY_LABELS = ["Easy", "Simple", "Medium", "Tricky", "Showstopper"] as const;

function readyInLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h}hr`;
  if (!m) return hours;
  return `${hours} ${m}min${m === 1 ? "" : "s"}`;
}

function DifficultyIcon() {
  return (
    <svg className="recipe-facts-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M8 34a18 18 0 1 1 32 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M24 34V18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 34l10-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="34" r="2.4" fill="currentColor" />
    </svg>
  );
}

function ServesIcon() {
  return (
    <svg className="recipe-facts-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M14 28c0-6 4.5-10 10-10s10 4 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10 30h28v3.5c0 2.5-2 4.5-4.5 4.5h-19A4.5 4.5 0 0 1 10 33.5V30Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M18 18c0-4 2.5-7 6-7s6 3 6 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 40h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg className="recipe-facts-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M12 20h24v14a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M10 20h28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 16h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="29" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M24 26.2V29l2.2 2.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
          <DifficultyIcon />
          <dt>Difficulty</dt>
          <dd>{difficultyLabel}</dd>
        </div>
      )}
      {servingsText && (
        <div className="recipe-fact">
          <ServesIcon />
          <dt>Serves</dt>
          <dd>{servingsText}</dd>
        </div>
      )}
      {readyLabel && (
        <div className="recipe-fact">
          <ReadyIcon />
          <dt>Ready in</dt>
          <dd>{readyLabel}</dd>
        </div>
      )}
    </dl>
  );
}
