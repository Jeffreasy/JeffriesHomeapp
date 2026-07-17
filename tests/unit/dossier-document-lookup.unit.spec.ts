import { expect, test } from "@playwright/test";
import {
  createDossierDocumentLookupUrl,
  selectExactDossierDocument,
} from "../../lib/laventecare/dossier-document-lookup";

test("dossier lookup delegates an exact encoded key to the backend without a list cap", () => {
  const key = "archief/offerte 100% #1.pdf";
  const url = new URL(createDossierDocumentLookupUrl("https://backend.example/api/v1/", key));

  expect(url.pathname).toBe("/api/v1/laventecare/dossier-documents");
  expect(url.searchParams.get("documentKey")).toBe(key);
  expect(url.searchParams.has("limit")).toBe(false);
  expect(url.searchParams.has("offset")).toBe(false);
});

test("dossier lookup accepts only an exact document-key match", () => {
  const documents = [
    { document_key: "other.pdf", id: "1" },
    { document_key: "target.pdf", id: "2" },
  ];

  expect(selectExactDossierDocument(documents, "target.pdf")?.id).toBe("2");
  expect(selectExactDossierDocument(documents, "TARGET.pdf")).toBeNull();
});