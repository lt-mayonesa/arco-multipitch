import { GEAR_DESCRIPTION, GEAR_LABEL, type GearBadgeKind } from "../lib/gear";

interface Props {
  kind: GearBadgeKind;
  size?: "sm" | "md";
}

export function GearBadge({ kind, size = "md" }: Props) {
  return (
    <span className={`gear-badge gear-badge--${kind} gear-badge--${size}`} title={GEAR_DESCRIPTION[kind]}>
      {kind === "runout" && "⚠ "}
      {GEAR_LABEL[kind]}
    </span>
  );
}
