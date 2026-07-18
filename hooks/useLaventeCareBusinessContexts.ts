"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { laventecareApi } from "@/lib/api";
import { buildLaventeCareContextOptions } from "@/lib/laventecare/business-context";
import { laventeCareQueryKeys } from "@/lib/laventecare/query-keys";
import { isClosedLaventeCareStatus } from "@/lib/laventecare/status";

type BusinessContextOptionsConfig = {
  enabled?: boolean;
};

export function useLaventeCareBusinessContextOptions({
  enabled = true,
}: BusinessContextOptionsConfig = {}) {
  const companiesQuery = useQuery({
    queryKey: laventeCareQueryKeys.companies.all,
    queryFn: () => laventecareApi.listCompanies({ limit: 250 }),
    staleTime: 60_000,
    enabled,
  });
  const leadsQuery = useQuery({
    queryKey: laventeCareQueryKeys.leads.all,
    queryFn: () => laventecareApi.listLeads({ limit: 100 }),
    staleTime: 60_000,
    enabled,
  });
  const projectsQuery = useQuery({
    queryKey: laventeCareQueryKeys.projects.all,
    queryFn: () => laventecareApi.listProjects({ limit: 100 }),
    staleTime: 60_000,
    enabled,
  });
  const workstreamsQuery = useQuery({
    queryKey: laventeCareQueryKeys.workstreams.all,
    queryFn: () => laventecareApi.listWorkstreams({ includeClosed: true, limit: 100 }),
    staleTime: 60_000,
    enabled,
  });

  const options = useMemo(
    () =>
      buildLaventeCareContextOptions({
        companies: companiesQuery.data,
        activeLeads: leadsQuery.data?.filter((item) => !isClosedLaventeCareStatus(item.status)),
        activeProjects: projectsQuery.data?.filter((item) => !isClosedLaventeCareStatus(item.status)),
        activeWorkstreams: workstreamsQuery.data?.filter((item) => !isClosedLaventeCareStatus(item.status)),
      }),
    [companiesQuery.data, leadsQuery.data, projectsQuery.data, workstreamsQuery.data],
  );

  return {
    options,
    isError:
      companiesQuery.isError ||
      leadsQuery.isError ||
      projectsQuery.isError ||
      workstreamsQuery.isError,
  };
}
