export const DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024;
export const DEFAULT_REQUEST_BODY_TIMEOUT_MS = 10_000;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeded the configured maximum.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class RequestBodyTimeoutError extends Error {
  constructor() {
    super("Request body was not received before the deadline.");
    this.name = "RequestBodyTimeoutError";
  }
}

/** Read an inbound body with a byte cap and one deadline for the complete stream. */
export async function readBoundedRequestBody(
  request: Request,
  maximumBytes = DEFAULT_MAX_REQUEST_BYTES,
  timeoutMs = DEFAULT_REQUEST_BODY_TIMEOUT_MS,
): Promise<ArrayBuffer> {
  const boundedMaximum = Math.max(1, Math.floor(maximumBytes));
  const boundedTimeout = Math.max(1, Math.floor(timeoutMs));
  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(declaredLength) && declaredLength > boundedMaximum) {
    await request.body?.cancel().catch(() => {});
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let completed = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let removeAbortListener = () => {};

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new RequestBodyTimeoutError()), boundedTimeout);
  });
  const abortPromise = new Promise<never>((_, reject) => {
    const rejectAbort = () => reject(new DOMException("Request aborted.", "AbortError"));
    if (request.signal.aborted) {
      rejectAbort();
      return;
    }
    request.signal.addEventListener("abort", rejectAbort, { once: true });
    removeAbortListener = () => request.signal.removeEventListener("abort", rejectAbort);
  });

  try {
    while (true) {
      const { done, value } = await Promise.race([
        reader.read(),
        timeoutPromise,
        abortPromise,
      ]);
      if (done) {
        completed = true;
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > boundedMaximum) throw new RequestBodyTooLargeError();
      chunks.push(value);
    }
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    removeAbortListener();
    if (!completed) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}
