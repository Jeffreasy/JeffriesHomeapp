import { expect, test } from "@playwright/test";
import {
  getLaventeCareMutationInvalidations,
  laventeCareMutationInvalidations,
  laventeCareQueryKeys,
} from "../../lib/laventecare/query-keys";

test("builds stable LaventeCare detail keys", () => {
  expect(laventeCareQueryKeys.companies.all).toEqual([
    "laventecare",
    "companies",
    "all",
  ]);
  expect(laventeCareQueryKeys.companies.picker("care")).toEqual([
    "laventecare",
    "companies",
    "picker",
    "care",
  ]);
  expect(laventeCareQueryKeys.companyActivity.detail("company-1")).toEqual([
    "laventecare",
    "activity",
    "company",
    "company-1",
  ]);
});

test("never invalidates the broad LaventeCare root", () => {
  for (const invalidations of Object.values(laventeCareMutationInvalidations)) {
    expect(invalidations.some(({ queryKey }) => queryKey.length === 1)).toBe(
      false,
    );
  }
});

test("invalidates only the resources affected by representative mutations", () => {
  expect(getLaventeCareMutationInvalidations("convertLead")).toEqual([
    { queryKey: laventeCareQueryKeys.cockpit, exact: true },
    { queryKey: laventeCareQueryKeys.leads.root, exact: false },
    { queryKey: laventeCareQueryKeys.projects.root, exact: false },
    { queryKey: laventeCareQueryKeys.companies.root, exact: false },
  ]);
  expect(getLaventeCareMutationInvalidations("createInvoice")).toEqual([
    { queryKey: laventeCareQueryKeys.billing, exact: true },
  ]);
  expect(getLaventeCareMutationInvalidations("createMailTemplate")).toEqual([
    { queryKey: laventeCareQueryKeys.cockpit, exact: true },
    { queryKey: laventeCareQueryKeys.mailbox, exact: true },
  ]);
});

test("refreshes denormalized company aggregates after linked-resource mutations", () => {
  const aggregateMutations = [
    "createContact",
    "updateContact",
    "createLead",
    "updateLead",
    "convertLead",
    "createProject",
    "updateProject",
    "createWorkstream",
    "updateWorkstream",
    "convertWorkstream",
    "createAction",
    "convertSignal",
    "createDossierDocument",
    "createActivityEvent",
    "sendTemplatedMail",
  ] as const;

  for (const mutation of aggregateMutations) {
    expect(getLaventeCareMutationInvalidations(mutation)).toContainEqual({
      queryKey: laventeCareQueryKeys.companies.root,
      exact: false,
    });
  }
});
