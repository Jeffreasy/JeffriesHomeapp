import { expect, test } from "@playwright/test";
import { resolveLaventeCarePdfDossierContextResult } from "../../lib/server/laventecare-pdf-context";

const ownerUserId = "user_owner";
const companyId = "11111111-1111-4111-8111-111111111111";

test("PDF context resolution distinguishes none, not-found and unavailable", async () => {
  await expect(
    resolveLaventeCarePdfDossierContextResult(null, ownerUserId, {
      list: async () => [],
    }),
  ).resolves.toEqual({ status: "none", context: null });

  await expect(
    resolveLaventeCarePdfDossierContextResult(
      { kind: "company", id: companyId },
      ownerUserId,
      { list: async () => [] },
    ),
  ).resolves.toEqual({ status: "not_found", context: null });

  await expect(
    resolveLaventeCarePdfDossierContextResult(
      { kind: "company", id: companyId },
      ownerUserId,
      {
        list: async () => {
          throw new Error("private backend detail");
        },
      },
    ),
  ).resolves.toEqual({ status: "unavailable", context: null });
});

test("a full backend page is unavailable rather than a false not-found result", async () => {
  const rows = Array.from({ length: 200 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    user_id: ownerUserId,
    naam: `Klant ${index}`,
  }));

  await expect(
    resolveLaventeCarePdfDossierContextResult(
      { kind: "company", id: companyId },
      ownerUserId,
      { list: async () => rows },
    ),
  ).resolves.toEqual({ status: "unavailable", context: null });
});

test("a failed related-company lookup fails the complete context closed", async () => {
  await expect(
    resolveLaventeCarePdfDossierContextResult(
      { kind: "lead", id: "22222222-2222-4222-8222-222222222222" },
      ownerUserId,
      {
        list: async (kind) => {
          if (kind === "company") throw new Error("private backend detail");
          return [
            {
              id: "22222222-2222-4222-8222-222222222222",
              user_id: ownerUserId,
              titel: "Veilige lead",
              company_id: companyId,
            },
          ];
        },
      },
    ),
  ).resolves.toEqual({ status: "unavailable", context: null });
});

test("PDF context resolution returns only an owner-scoped record", async () => {
  const result = await resolveLaventeCarePdfDossierContextResult(
    { kind: "company", id: companyId },
    ownerUserId,
    {
      list: async () => [
        { id: companyId, user_id: "user_other", naam: "Andere tenant" },
        { id: companyId, user_id: ownerUserId, naam: "Veilige klant" },
      ],
    },
  );

  expect(result).toMatchObject({
    status: "resolved",
    context: {
      kind: "company",
      id: companyId,
      title: "Veilige klant",
    },
  });
  expect(JSON.stringify(result)).not.toContain("Andere tenant");
});
