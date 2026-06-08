"use client";

import { useMemo } from "react";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { buildLaventeCareContextOptions } from "@/lib/laventecare/business-context";

export function useLaventeCareBusinessContextOptions() {
  const { companies, activeLeads, activeProjects, activeWorkstreams } = useLaventeCare();

  return useMemo(
    () => buildLaventeCareContextOptions({ companies, activeLeads, activeProjects, activeWorkstreams }),
    [activeLeads, activeProjects, activeWorkstreams, companies],
  );
}
