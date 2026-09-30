import type { GearLevel } from "../types";
import { GEAR_DESCRIPTION, GEAR_LABEL } from "../lib/gear";

interface Props {
  level: GearLevel;
  size?: "sm" | "md";
}

export function GearBadge({ level, size = "md" }: Props) {
  return (
    <span className={`gear-badge gear-badge--${level} gear-badge--${size}`} title={GEAR_DESCRIPTION[level]}>
      {GEAR_LABEL[level]}
    </span>
  );
}
