interface Props {
  french: string | null;
  raw: string | null;
  size?: "sm" | "md";
}

export function GradeBadge({ french, raw, size = "md" }: Props) {
  if (!french && !raw) {
    return <span className={`grade-badge grade-badge--unknown grade-badge--${size}`}>?</span>;
  }
  return (
    <span className={`grade-badge grade-badge--${size}`} title={raw ? `Original: ${raw}` : undefined}>
      {french ?? raw}
    </span>
  );
}
