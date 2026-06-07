import { NextResponse } from "next/server";

export function createLaventeCarePdfResponse({
  buffer,
  filename,
  inline,
  requestId,
}: {
  buffer: Buffer | Uint8Array;
  filename: string;
  inline: boolean;
  requestId: string;
}) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const body = new Blob([arrayBuffer], { type: "application/pdf" });
  const disposition = inline ? "inline" : "attachment";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Request-ID": requestId,
    },
  });
}

export function createLaventeCarePdfErrorResponse(message: string, status = 500, requestId?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(requestId ? { requestId } : {}),
    },
    {
      status,
      headers: requestId ? { "X-Request-ID": requestId } : undefined,
    }
  );
}

export function createLaventeCarePdfRequestId() {
  return `lc-pdf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
