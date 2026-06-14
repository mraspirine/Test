import { getUnitDef } from "@/domain/dimensions";
import type { ReviewUnit } from "@/domain/types";

export function UnitBadge({ unit }: { unit: ReviewUnit }) {
  const def = getUnitDef(unit);
  return <span className={`badge badge-${def.side}`}>{def.label}</span>;
}
