"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { laventecareApi } from "@/lib/api";
import type {
  DocumentItem,
  LeadItem,
  ProjectItem,
  BusinessSignal,
  FollowUpSignal,
  ActionItem,
  DecisionItem,
  ChangeRequestItem,
  SlaIncidentItem,
} from "@/components/laventecare/LaventeCareTypes";

export function useLaventeCare() {
  const queryClient = useQueryClient();

  const { data: cockpit, isLoading: cockpitLoading } = useQuery({
    queryKey: ["laventecare", "cockpit"],
    queryFn: () => laventecareApi.cockpit(),
    staleTime: 15_000,
  });

  const createLeadMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createLead>[0]) => laventecareApi.createLead(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateLeadMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string }) => laventecareApi.updateLead(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const convertLeadMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; naam: string; fase?: string; status?: string; samenvatting?: string }) =>
      laventecareApi.convertLeadToProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateProjectMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; fase?: string; status?: string }) =>
      laventecareApi.updateProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createActionMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createAction>[0]) => laventecareApi.createAction(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const convertSignalMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.convertSignalToLead>[0]) =>
      laventecareApi.convertSignalToLead(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateActionStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => laventecareApi.updateActionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const seedDocumentsMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.seedDocuments>[0]) => laventecareApi.seedDocuments(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const documents = useMemo(() => (cockpit?.documentCatalog ?? []) as DocumentItem[], [cockpit]);
  const activeLeads = useMemo(
    () =>
      (cockpit?.activeLeads ?? []).map((l) => ({
        ...l,
        _id: l.id,
        fitScore: l.fit_score ?? undefined,
        volgendeStap: l.volgende_stap ?? undefined,
        volgendeActieDatum: l.volgende_actie_datum ?? undefined,
      })) as LeadItem[],
    [cockpit]
  );
  const activeProjects = useMemo(
    () =>
      (cockpit?.activeProjects ?? []).map((p) => ({
        ...p,
        _id: p.id,
        waardeIndicatie: p.waarde_indicatie ?? undefined,
      })) as ProjectItem[],
    [cockpit]
  );
  const businessSignals = useMemo(
    () =>
      (cockpit?.businessSignals ?? []).map((s) => ({
        ...s,
        matchedTerm: s.matched_term,
        actionHint: s.action_hint,
      })) as BusinessSignal[],
    [cockpit]
  );
  const actionItems = useMemo(
    () =>
      (cockpit?.actionItems ?? []).map((a) => ({
        ...a,
        _id: a.id,
        actionType: a.action_type,
        dueDate: a.due_date ?? undefined,
        sourceId: a.source_id ?? undefined,
        linkedLeadId: a.linked_lead_id ?? undefined,
        linkedProjectId: a.linked_project_id ?? undefined,
        updatedAt: a.updated_at,
      })) as ActionItem[],
    [cockpit]
  );
  const followUps = useMemo(
    () =>
      (cockpit?.followUps ?? []).map((f) => ({
        ...f,
        actionHint: f.action_hint,
      })) as FollowUpSignal[],
    [cockpit]
  );
  const openIncidents = useMemo(
    () =>
      (cockpit?.openIncidents ?? []).map((i) => ({
        ...i,
        gemeldOp: i.gemeld_op,
        reactieDeadline: i.reactie_deadline ?? undefined,
      })) as SlaIncidentItem[],
    [cockpit]
  );
  const openChanges = useMemo(
    () =>
      (cockpit?.openChanges ?? []).map((c) => ({
        ...c,
        planningImpact: c.planning_impact ?? undefined,
        budgetImpact: c.budget_impact ?? undefined,
      })) as ChangeRequestItem[],
    [cockpit]
  );
  const recentDecisions = useMemo(() => (cockpit?.recentDecisions ?? []) as DecisionItem[], [cockpit]);

  const summary = cockpit?.summary ?? {
    leads: 0,
    activeLeads: 0,
    projects: 0,
    activeProjects: 0,
    documents: 0,
    openIncidents: 0,
    openChanges: 0,
    decisions: 0,
    actionItems: 0,
    documentsSeeded: false,
    knowledgeDocuments: 0,
    businessSignals: 0,
    followUps: 0,
  };

  return {
    cockpitLoading,
    documents,
    activeLeads,
    activeProjects,
    businessSignals,
    actionItems,
    followUps,
    openIncidents,
    openChanges,
    recentDecisions,
    summary,
    
    createLeadMut,
    updateLeadMut,
    convertLeadMut,
    updateProjectMut,
    createActionMut,
    convertSignalMut,
    updateActionStatusMut,
    seedDocumentsMut,
  };
}
