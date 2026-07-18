export const DEFAULT_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export class ResponseTooLargeError extends Error {
  constructor() {
    super("Response exceeded the configured maximum.");
    this.name = "ResponseTooLargeError";
  }
}

/** Consume an upstream body inside its attached deadline with a hard memory cap. */
export async function readBoundedResponseBody(
  response: Response,
  maximumBytes = DEFAULT_MAX_RESPONSE_BYTES,
): Promise<ArrayBuffer | null> {
  if (!response.body) return null;

  const boundedMaximum = Math.max(1, Math.floor(maximumBytes));
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > boundedMaximum) {
    await response.body.cancel().catch(() => {});
    throw new ResponseTooLargeError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > boundedMaximum) {
        await reader.cancel().catch(() => {});
        throw new ResponseTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
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
