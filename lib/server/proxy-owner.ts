export function isJsonRequestContentType(contentType: string): boolean {
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mediaType === "application/json" || mediaType.endsWith("+json");
}

export function shouldRejectProxyMutationBody(
  contentType: string,
  byteLength: number,
): boolean {
  return byteLength > 0 && !isJsonRequestContentType(contentType);
}
export function enforceOwnerQuery(searchParams: URLSearchParams, ownerUserId: string): void {
  searchParams.delete("user_id");
  searchParams.set("userId", ownerUserId);
}

function replaceOwnerFields(value: unknown, ownerUserId: string): void {
  if (Array.isArray(value)) {
    for (const item of value) replaceOwnerFields(item, ownerUserId);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (key === "userId" || key === "user_id") record[key] = ownerUserId;
    else replaceOwnerFields(child, ownerUserId);
  }
}

export function enforceOwnerJsonBody(body: string, ownerUserId: string): string {
  const parsed: unknown = JSON.parse(body);
  replaceOwnerFields(parsed, ownerUserId);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    record.userId = ownerUserId;
    record.user_id = ownerUserId;
  }

  return JSON.stringify(parsed);
}

/** Bodyless DELETE requests may still carry application/json from the client. */
export function enforceOptionalOwnerJsonBody(
  body: string,
  ownerUserId: string,
): string | undefined {
  if (!body.trim()) return undefined;
  return enforceOwnerJsonBody(body, ownerUserId);
}
