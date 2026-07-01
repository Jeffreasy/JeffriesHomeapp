"use client";

import { useMemo } from "react";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { buildLaventeCareContextOptions } from "@/lib/laventecare/business-context";

export function useLaventeCareBusinessContextOptions() {
  const { companies, activeLeads, activeProjects, activeWorkstreams, cockpitError } = useLaventeCare();

  const options = useMemo(
    () => buildLaventeCareContextOptions({ companies, activeLeads, activeProjects, activeWorkstreams }),
    [activeLeads, activeProjects, activeWorkstreams, companies],
  );

  return { options, isError: cockpitError };
}
