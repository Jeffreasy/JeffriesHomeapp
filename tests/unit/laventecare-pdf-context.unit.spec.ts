import { expect, test } from "@playwright/test";
import {
  createLaventeCarePdfDossierReference,
  encodeLaventeCarePdfDossierContext,
  getLaventeCarePdfDossierReferenceFromLink,
  parseLaventeCarePdfDossierReference,
} from "../../lib/laventecare/pdf/context";
import {
  getLaventeCarePdfUrl,
  getLaventeCarePdfViewerUrl,
} from "../../lib/laventecare/pdf/registry";
import {
  resolveLaventeCarePdfDossierContext,
  type LaventeCarePdfContextSource,
} from "../../lib/server/laventecare-pdf-context";
import { dossierDocumentViewerHref } from "../../components/laventecare/LaventeCareUtils";

const OWNER_ID = "user_owner";
const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "22222222-2222-4222-8222-222222222222";

const SENSITIVE_CONTEXT_KEYS = [
  "ctxTitle",
  "ctxCompany",
  "ctxStatus",
  "ctxPriority",
  "ctxPhase",
  "ctxScore",
  "ctxValue",
  "ctxSource",
  "ctxSummary",
  "ctxPain",
  "ctxNext",
  "ctxDue",
] as const;

function paramsFor(url: string) {
  return new URL(url, "https://homeapp.example").searchParams;
}

function expectOpaqueContextOnly(params: URLSearchParams, includeDelivery: boolean) {
  const expectedKeys = includeDelivery
    ? ["theme", "delivery", "ctx", "ctxId"]
    : ["theme", "ctx", "ctxId"];

  expect([...params.keys()]).toEqual(expectedKeys);
  expect(params.get("ctx")).toBe("lead");
  expect(params.get("ctxId")).toBe(LEAD_ID);
  for (const key of SENSITIVE_CONTEXT_KEYS) expect(params.has(key)).toBe(false);
}

test("PDF URLs contain only dossier kind and opaque id", () => {
  const context = {
    kind: "lead" as const,
    id: LEAD_ID,
    title: "Acme geheime lead",
    company: "Acme Zorg",
    status: "open",
    priority: "hoog",
    phase: "discovery",
    score: 91,
    valueLabel: "€ 25.000",
    source: "vertrouwelijke bron",
    summary: "Interne samenvatting",
    painPoint: "Gevoelig pijnpunt",
    nextStep: "Niet delen",
    dueDate: "18 juli 2026",
  };

  expect(encodeLaventeCarePdfDossierContext(context)).toEqual({
    ctx: "lead",
    ctxId: LEAD_ID,
  });

  const pdfUrl = getLaventeCarePdfUrl({
    documentKey: "voorstel-template",
    context,
  });
  const viewerUrl = getLaventeCarePdfViewerUrl({
    documentKey: "voorstel-template",
    context,
  });

  expectOpaqueContextOnly(paramsFor(pdfUrl), true);
  expectOpaqueContextOnly(paramsFor(viewerUrl), false);
  expect(pdfUrl).not.toContain("Acme");
  expect(pdfUrl).not.toContain("Gevoelig");
  expect(viewerUrl).not.toContain("Interne");
});

test("manual, missing and non-UUID contexts never become URL references", () => {
  expect(encodeLaventeCarePdfDossierContext({ kind: "manual", id: LEAD_ID })).toEqual({});
  expect(encodeLaventeCarePdfDossierContext({ kind: "lead" })).toEqual({});
  expect(encodeLaventeCarePdfDossierContext({ kind: "lead", id: "Acme klantnaam" })).toEqual({});
  expect(createLaventeCarePdfDossierReference("lead", "Acme klantnaam")).toBeNull();
});

test("legacy sensitive query fields are ignored instead of propagated", () => {
  const legacy = new URLSearchParams({
    ctx: "lead",
    ctxId: LEAD_ID,
    ctxTitle: "Geheime titel",
    ctxCompany: "Geheime klant",
    ctxSummary: "Geheime samenvatting",
    ctxPain: "Geheim pijnpunt",
    ctxNext: "Geheime vervolgstap",
  });

  expect(parseLaventeCarePdfDossierReference(legacy)).toEqual({
    kind: "lead",
    id: LEAD_ID,
  });

  const viewerUrl = dossierDocumentViewerHref({
    document_key: "voorstel-template",
    theme: "screen",
    pdf_url: `/api/laventecare/pdf/voorstel-template?${legacy.toString()}`,
  });

  expectOpaqueContextOnly(paramsFor(viewerUrl), false);
  expect(viewerUrl).not.toContain("Geheime");
});

test("stored dossier links prefer canonical linked ids", () => {
  expect(
    getLaventeCarePdfDossierReferenceFromLink({
      context_type: "klantdossier",
      context_id: COMPANY_ID,
      lead_id: LEAD_ID,
    }),
  ).toEqual({ kind: "company", id: COMPANY_ID });
});

test("server resolver rebuilds lead context from owner-scoped backend lists", async () => {
  const calls: string[] = [];
  const rows = {
    lead: [
      {
        id: LEAD_ID,
        user_id: "other_user",
        titel: "Verkeerde tenant",
      },
      {
        id: LEAD_ID,
        user_id: OWNER_ID,
        company_id: COMPANY_ID,
        titel: "Veilige lead",
        status: "open",
        prioriteit: "hoog",
        fit_score: 88,
        bron: "referral",
        pijnpunt: "Procesverlies",
        volgende_stap: "Plan intake",
        volgende_actie_datum: "2026-07-25",
      },
    ],
    company: [
      {
        id: COMPANY_ID,
        user_id: OWNER_ID,
        naam: "Acme Zorg",
      },
    ],
    project: [],
    workstream: [],
  } satisfies Record<string, unknown[]>;
  const source: LaventeCarePdfContextSource = {
    async list(kind) {
      calls.push(kind);
      return rows[kind];
    },
  };

  const context = await resolveLaventeCarePdfDossierContext(
    { kind: "lead", id: LEAD_ID },
    OWNER_ID,
    source,
  );

  expect(context).toMatchObject({
    kind: "lead",
    id: LEAD_ID,
    title: "Veilige lead",
    company: "Acme Zorg",
    status: "open",
    priority: "hoog",
    score: 88,
    painPoint: "Procesverlies",
    nextStep: "Plan intake",
  });
  expect(calls).toEqual(["lead", "company"]);
});

test("server resolver fails closed for another owner", async () => {
  const source: LaventeCarePdfContextSource = {
    async list() {
      return [{ id: LEAD_ID, user_id: "other_user", titel: "Andere tenant" }];
    },
  };

  await expect(
    resolveLaventeCarePdfDossierContext(
      { kind: "lead", id: LEAD_ID },
      OWNER_ID,
      source,
    ),
  ).resolves.toBeNull();
});
