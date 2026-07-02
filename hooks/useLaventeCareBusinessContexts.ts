"use client";

import { useMemo } from "react";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { buildLaventeCareContextOptions } from "@/lib/laventecare/business-context";

export function useLaventeCareBusinessContextOptions() {
  const { companies, activeLeads, activeProjects, activeWorkstreams, cockpitError, companiesError } =
    useLaventeCare();

  const options = useMemo(
    () => buildLaventeCareContextOptions({ companies, activeLeads, activeProjects, activeWorkstreams }),
    [activeLeads, activeProjects, activeWorkstreams, companies],
  );

  // R3-H5: de klant-context wordt nu uit de dedicated companies-query gevoed;
  // toon de "kan onvolledig zijn"-melding zodra die (of de cockpit) faalt.
  return { options, isError: cockpitError || companiesError };
}
