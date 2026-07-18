import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("private note drafts never use durable localStorage", () => {
  const noteEditor = readSource("components/notes/NoteEditor.tsx");

  expect(noteEditor).toContain("window.sessionStorage");
  expect(noteEditor).not.toContain("window.localStorage");
});

test("query cache persistence packages remain absent", () => {
  const packageJson = readSource("package.json");
  expect(packageJson).not.toMatch(/query-(?:async-storage|sync-storage)-persister|persist-client/);
});
