import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { expect, test } from "@playwright/test";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const standardRoutePages = [
  "app/page.tsx",
  "app/agenda/page.tsx",
  "app/automations/page.tsx",
  "app/contacten/page.tsx",
  "app/finance/page.tsx",
  "app/habits/page.tsx",
  "app/lampen/page.tsx",
  "app/laventecare/page.tsx",
  "app/notities/page.tsx",
  "app/rooster/page.tsx",
  "app/settings/page.tsx",
] as const;

const intentionallyChromelessPages = [
  "app/focus/page.tsx",
  "app/laventecare/documenten/[documentKey]/page.tsx",
] as const;

function readSource(relativePath: string) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("ClientShell owns the only main landmark for standard routes", () => {
  const source = readSource("components/layout/ClientShell.tsx");
  const mainTags = source.match(/<main\b[^>]*>/g) ?? [];

  expect(mainTags).toHaveLength(1);
  expect(mainTags[0]).toMatch(/\bid\s*=\s*["']main["']/);
  expect(source.match(/\bid\s*=\s*["']main["']/g) ?? []).toHaveLength(1);
});

test("all eleven standard route pages use AppPageShell without duplicating shell spacing", () => {
  expect(standardRoutePages).toHaveLength(11);
  for (const excludedPage of intentionallyChromelessPages) {
    expect(standardRoutePages).not.toContain(excludedPage);
  }

  for (const relativePath of standardRoutePages) {
    const source = readSource(relativePath);

    expect(source, `${relativePath} must import the shared page boundary`).toMatch(
      /from\s+["']@\/components\/layout\/AppPageShell["']/,
    );
    expect(source, `${relativePath} must render the shared page boundary`).toMatch(
      /<AppPageShell\b/,
    );
    expect(source, `${relativePath} must not add another main landmark`).not.toMatch(
      /<main\b/,
    );
    expect(source, `${relativePath} must leave mobile-nav clearance to ClientShell`).not.toMatch(
      /\bpb-(?:24|28)\b/,
    );
  }
});

test("overlays share one portal root and one accessible surface primitive", () => {
  const rootLayout = readSource("app/layout.tsx");
  const overlaySurface = readSource("components/ui/OverlaySurface.tsx");

  expect(rootLayout.match(/\bid\s*=\s*["']app-overlay-root["']/g) ?? []).toHaveLength(1);
  expect(rootLayout).toMatch(/\bdata-overlay-root\b/);

  expect(overlaySurface).toContain("useOverlayLifecycle(");
  expect(overlaySurface).toContain("createPortal(");
  expect(overlaySurface).toContain("getOverlayPortalRoot()");
  expect(overlaySurface).toMatch(/role=\{role\}/);
  expect(overlaySurface).toMatch(/aria-modal=["']true["']/);
});

test("privacy toggles stay disabled while the persisted preference is unknown", () => {
  const privacyRoutes = [
    "app/page.tsx",
    "app/finance/page.tsx",
    "app/habits/page.tsx",
    "app/notities/page.tsx",
    "app/settings/page.tsx",
  ] as const;
  const privacySurfaces = [
    "components/dashboard/DashboardHeader.tsx",
    "app/finance/page.tsx",
    "components/habits/HabitsHeader.tsx",
    "components/notes/NotesHeader.tsx",
    "app/settings/page.tsx",
  ] as const;

  for (const relativePath of privacyRoutes) {
    expect(readSource(relativePath), `${relativePath} must expose unknown server state`).toContain(
      "isServerUnknown:",
    );
  }
  for (const relativePath of privacySurfaces) {
    const source = readSource(relativePath);
    expect(source, `${relativePath} must announce loading`).toMatch(/aria-busy=\{[^}]*isPrivacyUnknown/);
    expect(source, `${relativePath} must prevent an unsafe toggle`).toMatch(/disabled=\{[^}]*isPrivacyUnknown/);
  }
});

test("NoteEditor joins the central overlay stack without duplicating lifecycle mechanics", () => {
  const source = readSource("components/notes/NoteEditor.tsx");

  expect(source).toContain("useOverlayLifecycle(");
  expect(source).toContain("getOverlayPortalRoot()");
  expect(source).toContain("window.visualViewport");
  expect(source).not.toContain('createPortal(editorModal, document.body)');
  expect(source).not.toContain('document.body.style.overflow');
  expect(source).not.toContain('event.key === "Tab"');
});

test("toast feedback remains outside modal background inerting", () => {
  const rootLayout = readSource("app/layout.tsx");
  const overlayManager = readSource("lib/overlays/overlay-manager.ts");
  const toast = readSource("components/ui/Toast.tsx");

  expect(rootLayout.match(/\bid\s*=\s*["']app-toast-root["']/g) ?? []).toHaveLength(1);
  expect(overlayManager).toContain('element.id === "app-toast-root"');
  expect(overlayManager).toContain("getToastPortalRoot");
  expect(toast).toContain("createPortal(");
  expect(toast).toContain("getToastPortalRoot()");
});

test("dirty modals delegate discard confirmation to the critical overlay stack", () => {
  const modal = readSource("components/ui/Modal.tsx");
  const confirmDialog = readSource("components/ui/ConfirmDialog.tsx");

  expect(modal).toContain("useConfirm()");
  expect(modal).not.toContain("useFocusTrap(");
  expect(modal).not.toContain('role="alertdialog"');
  expect(confirmDialog).toContain('priority="critical"');
});
