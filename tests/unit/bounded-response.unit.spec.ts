import { expect, test } from "@playwright/test";
import {
  readBoundedResponseBody,
  ResponseTooLargeError,
} from "../../lib/server/bounded-response";

test("bounded response reader returns complete bytes within the cap", async () => {
  const response = new Response("safe-json", {
    headers: { "Content-Type": "application/json" },
  });
  const body = await readBoundedResponseBody(response, 32);

  expect(new TextDecoder().decode(body ?? new Uint8Array())).toBe("safe-json");
});

test("bounded response reader rejects declared and streamed oversize bodies", async () => {
  await expect(
    readBoundedResponseBody(
      new Response("small", { headers: { "Content-Length": "100" } }),
      8,
    ),
  ).rejects.toBeInstanceOf(ResponseTooLargeError);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(6));
      controller.enqueue(new Uint8Array(6));
      controller.close();
    },
  });
  await expect(readBoundedResponseBody(new Response(stream), 8)).rejects.toBeInstanceOf(
    ResponseTooLargeError,
  );
});
