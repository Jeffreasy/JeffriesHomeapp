import { expect, test } from "@playwright/test";
import {
  readBoundedRequestBody,
  RequestBodyTimeoutError,
  RequestBodyTooLargeError,
} from "../../lib/server/bounded-request";

test("bounded request reader returns complete bytes within the cap", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    body: "safe-json",
    headers: { "Content-Type": "application/json" },
  });

  const body = await readBoundedRequestBody(request, 32, 100);
  expect(new TextDecoder().decode(body)).toBe("safe-json");
});

test("bounded request reader rejects declared and streamed oversize bodies", async () => {
  await expect(
    readBoundedRequestBody(
      new Request("https://example.test", {
        method: "POST",
        body: "small",
        headers: { "Content-Length": "100" },
      }),
      8,
      100,
    ),
  ).rejects.toBeInstanceOf(RequestBodyTooLargeError);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(6));
      controller.enqueue(new Uint8Array(6));
      controller.close();
    },
  });
  await expect(
    readBoundedRequestBody(
      new Request("https://example.test", { method: "POST", body: stream, duplex: "half" } as RequestInit),
      8,
      100,
    ),
  ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
});

test("bounded request reader aborts a stalled stream at its deadline", async () => {
  const stream = new ReadableStream<Uint8Array>({ start() {} });
  const request = new Request("https://example.test", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);

  await expect(readBoundedRequestBody(request, 32, 5)).rejects.toBeInstanceOf(
    RequestBodyTimeoutError,
  );
});
