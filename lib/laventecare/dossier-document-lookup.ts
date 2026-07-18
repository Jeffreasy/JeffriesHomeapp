export function createDossierDocumentLookupUrl(
  backendBaseUrl: string,
  documentKey: string,
): string {
  const url = new URL(
    `${backendBaseUrl.replace(/\/+$/, "")}/laventecare/dossier-documents`,
  );
  url.searchParams.set("documentKey", documentKey);
  return url.toString();
}

export function selectExactDossierDocument<T extends { document_key: string }>(
  documents: readonly T[],
  documentKey: string,
): T | null {
  return documents.find((document) => document.document_key === documentKey) ?? null;
}