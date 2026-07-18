import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourceRoots = ["app", "components", "hooks", "lib"] as const;

const intentionallyChromelessPages = new Set([
  "app/access-denied/page.tsx",
  "app/focus/page.tsx",
  "app/laventecare/documenten/[documentKey]/page.tsx",
  "app/sign-in/[[...sign-in]]/page.tsx",
  "app/sign-up/[[...sign-up]]/page.tsx",
]);

// Existing interactive workspaces are explicit debt, not a precedent for new
// route-level client boundaries. Remove entries as pages become server shells.
const approvedClientRoutePages = new Set([
  "app/page.tsx",
  "app/access-denied/page.tsx",
  "app/agenda/page.tsx",
  "app/automations/page.tsx",
  "app/contacten/page.tsx",
  "app/finance/page.tsx",
  "app/focus/page.tsx",
  "app/habits/page.tsx",
  "app/lampen/page.tsx",
  "app/laventecare/page.tsx",
  "app/notities/page.tsx",
  "app/rooster/page.tsx",
  "app/settings/page.tsx",
]);

function normalizePath(filePath: string) {
  return relative(repositoryRoot, filePath).split(sep).join("/");
}

function walkFiles(directory: string, predicate: (filePath: string) => boolean): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(entryPath, predicate));
    else if (entry.isFile() && predicate(entryPath)) files.push(entryPath);
  }
  return files;
}

function readSource(relativePath: string) {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

let cachedSourceFiles: string[] | null = null;
const sourceCache = new Map<string, string>();

function sourceFiles() {
  cachedSourceFiles ??= sourceRoots
    .flatMap((sourceRoot) =>
      walkFiles(resolve(repositoryRoot, sourceRoot), (filePath) => /\.(?:ts|tsx)$/.test(filePath)),
    )
    .filter((filePath) => !normalizePath(filePath).startsWith("lib/api/generated/"));
  return cachedSourceFiles;
}

function cachedSource(filePath: string) {
  const existing = sourceCache.get(filePath);
  if (existing !== undefined) return existing;
  const source = readFileSync(filePath, "utf8");
  sourceCache.set(filePath, source);
  return source;
}

function filesMatching(pattern: RegExp) {
  return sourceFiles()
    .filter((filePath) => pattern.test(cachedSource(filePath)))
    .map(normalizePath)
    .sort();
}

test("every discovered standard page composes the canonical application shell", () => {
  const pages = walkFiles(
    resolve(repositoryRoot, "app"),
    (filePath) => basename(filePath) === "page.tsx",
  ).sort();

  expect(pages.length).toBeGreaterThan(0);
  for (const pagePath of pages) {
    const relativePath = normalizePath(pagePath);
    const source = readFileSync(pagePath, "utf8");
    const isClientPage = /^\s*["']use client["'];/m.test(source);

    if (isClientPage) {
      expect(
        approvedClientRoutePages.has(relativePath),
        `${relativePath} adds a route-level client boundary without an explicit architecture decision`,
      ).toBe(true);
    }

    if (intentionallyChromelessPages.has(relativePath)) continue;

    expect(source, `${relativePath} must import AppPageShell`).toMatch(
      /from\s+["']@\/components\/layout\/AppPageShell["']/,
    );
    expect(source, `${relativePath} must render AppPageShell`).toMatch(/<AppPageShell\b/);
    expect(source, `${relativePath} must not introduce another main landmark`).not.toMatch(/<main\b/);
    expect(source, `${relativePath} must leave mobile navigation clearance to ClientShell`).not.toMatch(
      /\bpb-(?:24|28)\b/,
    );
  }
});

test("portal and document-lock mechanics remain centralized", () => {
  expect(filesMatching(/\bcreatePortal\s*\(/)).toEqual([
    "components/notes/NoteEditor.tsx",
    "components/ui/OverlaySurface.tsx",
    "components/ui/Toast.tsx",
  ]);

  expect(
    filesMatching(
      /(?:body|document\.body)\.style\.(?:overflow|paddingRight)|(?:html|document\.documentElement)\.style\.(?:overflow|overscrollBehavior)|\.inert\s*=/,
    ),
  ).toEqual(["lib/overlays/overlay-manager.ts"]);
});

test("raw fetch stays limited to approved transport boundaries", () => {
  expect(filesMatching(/\bfetch\(/)).toEqual([
    "app/laventecare/documenten/[documentKey]/page.tsx",
    "lib/observability/client-events.ts",
    "lib/server/laventecare-pdf-context.ts",
  ]);
});

test("heavy optional workspaces and PDF parsers stay behind interaction boundaries", () => {
  const rosterPage = readSource("app/rooster/page.tsx");
  const rosterOverview = readSource("components/schedule/RoosterOverview.tsx");
  const payslipUploader = readSource("components/salary/LoonstrookUploader.tsx");
  const mailbox = readSource("components/laventecare/LaventeCareMailboxView.tsx");

  expect(rosterPage).not.toMatch(/import\s+\{\s*StatsView\s*\}\s+from/);
  expect(rosterPage).not.toMatch(/import\s+\{\s*SalarisView\s*\}\s+from/);
  expect(rosterPage).toContain('import("@/components/schedule/StatsView")');
  expect(rosterPage).toContain('import("@/components/salary/SalarisView")');
  expect(rosterOverview).not.toMatch(/import\s+\{\s*MonthBalanceChart\s*\}\s+from/);
  expect(rosterOverview).toContain('import("./MonthBalanceChart")');

  expect(payslipUploader).toContain('import type { ParseResult } from "@/lib/loonstrook-pdf"');
  expect(payslipUploader).toContain('await import("@/lib/loonstrook-pdf")');
  expect(mailbox).toContain(
    'import type { LaventeCareMailAttachmentContext } from "@/lib/laventecare/mail-attachments"',
  );
  expect(mailbox).toContain('await import(');
  expect(mailbox).toContain('"@/lib/laventecare/mail-attachments"');
});

test("the existing components/ui layer is not duplicated by a parallel core tree", () => {
  expect(existsSync(resolve(repositoryRoot, "components", "core"))).toBe(false);
});

test("the single-owner sign-in surface cannot start an enrollment flow", () => {
  const signInPage = readSource("app/sign-in/[[...sign-in]]/page.tsx");
  const providers = readSource("app/providers.tsx");
  const signUpPage = readSource("app/sign-up/[[...sign-up]]/page.tsx");

  expect(signInPage).toContain("withSignUp={false}");
  expect(signInPage).toContain("transferable={false}");
  expect(signInPage).toContain('signUpUrl="/sign-in"');
  expect(providers).toContain('signUpUrl="/sign-in"');
  expect(signUpPage).toContain('redirect("/sign-in")');
});
