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

test("anchored interactions share one responsive popover boundary", () => {
  const popover = readSource("components/ui/Popover.tsx");

  expect(popover).toContain("createPortal(");
  expect(popover).toContain("getOverlayPortalRoot()");
  expect(popover).toContain("<BottomSheet");
  expect(popover).toContain('document.addEventListener("pointerdown"');
  expect(popover).toContain('event.key !== "Escape"');

  for (const consumer of [
    "components/scenes/SceneBar.tsx",
    "components/finance/TransactionList.tsx",
  ]) {
    const source = readSource(consumer);
    expect(source, consumer + " must compose Popover").toContain("<Popover");
    expect(source, consumer + " must not own outside-click listeners").not.toContain(
      'document.addEventListener("pointerdown"',
    );
  }
});

test("searchable pickers share one keyboard and ARIA combobox contract", () => {
  const picker = readSource("components/ui/SearchablePicker.tsx");
  const popover = readSource("components/ui/Popover.tsx");
  const bottomSheet = readSource("components/ui/BottomSheet.tsx");

  expect(picker).toContain("<Popover");
  expect(picker).toContain('role="combobox"');
  expect(picker).toContain('aria-autocomplete="list"');
  expect(picker).toContain("aria-activedescendant=");
  expect(picker).toContain('role="listbox"');
  expect(picker).toContain('role: "option"');
  expect(picker).toContain('"aria-selected"');
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"]) {
    expect(picker, `SearchablePicker must handle ${key}`).toContain(`event.key === "${key}"`);
  }
  expect(popover).toContain("initialFocusRef={initialFocusRef}");
  expect(bottomSheet).toContain("initialFocusRef={initialFocusRef}");

  for (const consumer of [
    "components/laventecare/BusinessContextPicker.tsx",
    "components/notes/NoteEditor.tsx",
  ]) {
    const source = readSource(consumer);
    expect(source, consumer + " must compose SearchablePicker").toContain("<SearchablePicker");
    expect(source, consumer + " must not own document interaction listeners").not.toContain(
      "document.addEventListener",
    );
    expect(source, consumer + " must leave combobox ARIA to the primitive").not.toContain(
      'role="combobox"',
    );
  }
});

test("combobox suggestions use the collision-safe input listbox boundary", () => {
  const anchoredListbox = readSource("components/ui/InputAnchoredListbox.tsx");
  const mentionMenu = readSource("components/notes/ContactMentionMenu.tsx");
  const quickNote = readSource("components/notes/QuickNote.tsx");
  const notesPage = readSource("app/notities/page.tsx");

  expect(anchoredListbox).toContain("createPortal(");
  expect(anchoredListbox).toContain("getOverlayPortalRoot()");
  expect(anchoredListbox).toContain("ResizeObserver");
  expect(anchoredListbox).toContain("z-[var(--layer-popover)]");
  expect(mentionMenu).toContain("<InputAnchoredListbox");
  expect(mentionMenu).toContain("tabIndex={-1}");
  expect(mentionMenu).not.toContain("z-40");
  expect(quickNote).toContain("anchorRef={mentionAnchorRef}");
  expect(notesPage).toContain("anchorRef={mentionAnchorRef}");
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

test("the reduced-motion policy wraps PWA feedback and identity-scoped content", () => {
  const source = readSource("app/providers.tsx");
  const motionStart = source.indexOf('<MotionConfig reducedMotion="user">');
  const motionEnd = source.indexOf("</MotionConfig>", motionStart);

  expect(motionStart).toBeGreaterThanOrEqual(0);
  expect(motionEnd).toBeGreaterThan(motionStart);
  expect(source.indexOf("<PwaRegistry />")).toBeGreaterThan(motionStart);
  expect(source.indexOf("<PwaRegistry />")).toBeLessThan(motionEnd);
  expect(source.indexOf("<IdentityScopedProviders>")).toBeGreaterThan(motionStart);
  expect(source.indexOf("<IdentityScopedProviders>")).toBeLessThan(motionEnd);
});

test("NoteEditor joins the central overlay stack without duplicating lifecycle mechanics", () => {
  const source = readSource("components/notes/NoteEditor.tsx");

  expect(source).toContain("<OverlaySurface");
  expect(source).not.toContain("useOverlayLifecycle(");
  expect(source).not.toContain("getOverlayPortalRoot()");
  expect(source).not.toContain("createPortal(");
  expect(source).toContain("window.visualViewport");
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

test("action modals keep persistent controls in the canonical footer", () => {
  const notes = readSource("components/notes/NotesFilters.tsx");
  const dossier = readSource("components/laventecare/LaventeCareCustomerDossier.tsx");
  const mailbox = readSource("components/laventecare/LaventeCareMailboxView.tsx");
  const documentation = readSource("docs/interface-system.md");

  expect(notes).toContain('const TAG_MANAGER_FORM_ID = "notes-tag-manager-rename-form"');
  expect(notes).toContain("id={TAG_MANAGER_FORM_ID}");
  expect(notes).toContain("form={TAG_MANAGER_FORM_ID}");
  expect(notes).toContain("<ModalCancelButton");

  for (const formId of ["DOSSIER_ACTIVITY_FORM_ID", "DOSSIER_ACCESS_FORM_ID"]) {
    expect(dossier).toContain(`id={${formId}}`);
    expect(dossier).toContain(`form={${formId}}`);
  }
  expect(dossier).toContain("footer={");
  expect(dossier).toContain("<ModalCancelButton");

  expect(mailbox.match(/footer=\{/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  expect(mailbox).toContain("state.primaryAction || state.externalLink");
  expect(mailbox).toContain("<ModalCancelButton");
  expect(mailbox).not.toContain(
    'className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3 sm:px-5"',
  );
  expect(documentation).toContain("Puur informatieve previews krijgen bewust geen lege footer");
});
