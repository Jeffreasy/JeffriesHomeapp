import type { SalarisRecord } from "@/hooks/useSalary";
import type { LoonstrookRecord } from "@/hooks/useLoonstroken";

export interface SalarisDisplayRecord extends SalarisRecord {
  bron: "werkelijk" | "prognose";
  werkelijk?: LoonstrookRecord;
}
