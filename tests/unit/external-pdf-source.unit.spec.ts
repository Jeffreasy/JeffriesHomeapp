import { expect, test } from "@playwright/test";
import {
  getAllowedExternalPdfUrl,
  parseExternalPdfSourceHosts,
} from "../../lib/server/external-pdf-source";

test("external PDF sources require an exact configured HTTPS hostname", () => {
  const hosts = parseExternalPdfSourceHosts("files.example.test, archive.example.test");

  expect(getAllowedExternalPdfUrl("https://files.example.test/document.pdf", hosts)).toBe(
    "https://files.example.test/document.pdf",
  );
  expect(getAllowedExternalPdfUrl("http://files.example.test/document.pdf", hosts)).toBeNull();
  expect(getAllowedExternalPdfUrl("https://cdn.files.example.test/document.pdf", hosts)).toBeNull();
  expect(getAllowedExternalPdfUrl("https://files.example.test:8443/document.pdf", hosts)).toBeNull();
  expect(getAllowedExternalPdfUrl("https://user:pass@files.example.test/document.pdf", hosts)).toBeNull();
  expect(getAllowedExternalPdfUrl("not-a-url", hosts)).toBeNull();
});

test("host configuration rejects schemes, paths and wildcard syntax", () => {
  const hosts = parseExternalPdfSourceHosts(
    "https://files.example.test,files.example.test/path,*.example.test,valid.example.test",
  );

  expect([...hosts]).toEqual(["valid.example.test"]);
});

test("an empty allowlist hides every external PDF source", () => {
  const hosts = parseExternalPdfSourceHosts(undefined);

  expect(hosts.size).toBe(0);
  expect(getAllowedExternalPdfUrl("https://files.example.test/document.pdf", hosts)).toBeNull();
});
