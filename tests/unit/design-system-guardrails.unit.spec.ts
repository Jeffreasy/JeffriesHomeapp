import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import * as ts from "typescript";
import { HABIT_COLORS } from "../../lib/habit-constants";
import { habitColorStyle } from "../../components/habits/HabitsUtils";
import { hexContrastRatio } from "../../lib/ui/colorContrast";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const applicationRoots = ["app", "components", "hooks", "lib"] as const;

function normalizePath(filePath: string) {
  return relative(repositoryRoot, filePath).split(sep).join("/");
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(entryPath);
      return entry.isFile() && /\.(?:css|ts|tsx)$/.test(entryPath) ? [entryPath] : [];
    })
    .sort();
}

const applicationFiles = applicationRoots
  .flatMap((root) => walkFiles(resolve(repositoryRoot, root)))
  .filter((filePath) => !normalizePath(filePath).startsWith("lib/api/generated/"))
  .sort();
const scriptFiles = applicationFiles.filter((filePath) => /\.tsx?$/.test(filePath));
const stylesheetFiles = applicationFiles.filter((filePath) => filePath.endsWith(".css"));
const integrityFiles = [
  ...applicationFiles,
  ...walkFiles(resolve(repositoryRoot, "tests")),
].sort();

function findings(pattern: RegExp, files = applicationFiles) {
  return files.flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return [...source.matchAll(new RegExp(pattern.source, pattern.flags))].map((match) => {
      const line = source.slice(0, match.index).split("\n").length;
      return normalizePath(filePath) + ":" + String(line);
    });
  });
}

function parseSource(filePath: string) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function hasExportModifier(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
  );
}

function collectBindingNames(name: ts.BindingName, names: string[]) {
  if (ts.isIdentifier(name)) {
    names.push(name.text);
    return;
  }

  for (const element of name.elements) {
    if (ts.isBindingElement(element)) collectBindingNames(element.name, names);
  }
}

function namedExports(sourceFile: ts.SourceFile) {
  const exports = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) exports.add(element.name.text);
      } else {
        exports.add(statement.exportClause.name.text);
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const names: string[] = [];
        collectBindingNames(declaration.name, names);
        names.forEach((name) => exports.add(name));
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      exports.add(statement.name.text);
    }
  }

  return exports;
}

function sourceLocation(sourceFile: ts.SourceFile, node: ts.Node) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return normalizePath(sourceFile.fileName) + ":" + String(line + 1);
}

function classTokenLocations(pattern: RegExp) {
  const locations: string[] = [];

  for (const filePath of scriptFiles) {
    const sourceFile = parseSource(filePath);
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const containsRetiredToken = node.text
          .split(/\s+/)
          .some((token) => pattern.test(token.split(":").at(-1) ?? token));
        pattern.lastIndex = 0;
        if (containsRetiredToken) locations.push(sourceLocation(sourceFile, node));
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  return locations;
}

function animationLiteralsWithoutReducedMotion() {
  const locations: string[] = [];

  for (const filePath of scriptFiles) {
    const sourceFile = parseSource(filePath);
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const tokens = node.text.split(/\s+/);
        const hasAnimation = tokens.some((token) =>
          /(?:^|:)animate-(?:spin|pulse|ping)$/.test(token),
        );
        const disablesAnimation = tokens.some(
          (token) => token === "motion-reduce:animate-none",
        );
        if (hasAnimation && !disablesAnimation) {
          locations.push(sourceLocation(sourceFile, node));
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  return locations;
}

function fixedHexToken(stylesheet: string, token: string) {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(escapedToken + ":\\s*(#[0-9a-fA-F]{6})\\s*;").exec(stylesheet);
  if (!match) throw new Error("Missing fixed six-digit hex token: " + token);
  return match[1];
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16));
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) {
    throw new Error("Invalid RGB hex value: " + hex);
  }
  const [red, green, blue] = channels.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function classTokens(classSource: string) {
  return classSource
    .split(/\s+/)
    .map((token) => token.replace(/^[{"'\x60(]+|["'\x60,)}]+$/g, "").split(":").at(-1) ?? token);
}

type ControlDimension = "height" | "width";

function hasSafeMinimumDimension(classSource: string, dimension: ControlDimension) {
  const axis = dimension === "height" ? "h" : "w";
  return classTokens(classSource).some((token) => {
    const scale = token.match(new RegExp("^min-" + axis + "-(\\d+(?:\\.\\d+)?)$"));
    if (scale) return Number(scale[1]) >= 11;

    const pixels = token.match(
      new RegExp("^min-" + axis + "-\\[(\\d+(?:\\.\\d+)?)px\\]$"),
    );
    if (pixels) return Number(pixels[1]) >= 44;

    const rem = token.match(
      new RegExp("^min-" + axis + "-\\[(\\d+(?:\\.\\d+)?)rem\\]$"),
    );
    if (rem) return Number(rem[1]) >= 2.75;

    return new RegExp(
      "^min-" + axis + "-\\[var\\(--(?:touch-target|control-height)[^)]*\\)\\]$",
    ).test(token);
  });
}

function encodesUndersizedDimension(classSource: string, dimension: ControlDimension) {
  const axis = dimension === "height" ? "h" : "w";
  return classTokens(classSource).some((token) => {
    const scale = token.match(
      new RegExp("^(?:min-" + axis + "|" + axis + "|size)-(\\d+(?:\\.\\d+)?)$"),
    );
    if (scale) return Number(scale[1]) < 11;
    if (new RegExp("^(?:min-" + axis + "|" + axis + "|size)-px$").test(token)) {
      return true;
    }

    const pixels = token.match(
      new RegExp(
        "^(?:min-" + axis + "|" + axis + "|size)-\\[(\\d+(?:\\.\\d+)?)px\\]$",
      ),
    );
    if (pixels) return Number(pixels[1]) < 44;

    const rem = token.match(
      new RegExp(
        "^(?:min-" + axis + "|" + axis + "|size)-\\[(\\d+(?:\\.\\d+)?)rem\\]$",
      ),
    );
    return rem ? Number(rem[1]) < 2.75 : false;
  });
}

function jsxAttribute(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
  name: string,
) {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === name,
  );
}

function stringAttributeValue(attribute: ts.JsxAttribute | undefined) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (ts.isStringLiteral(attribute.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))
  ) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function hasAriaHidden(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
) {
  const attribute = jsxAttribute(node, sourceFile, "aria-hidden");
  if (!attribute) return false;
  if (!attribute.initializer) return true;

  const stringValue = stringAttributeValue(attribute);
  if (stringValue !== null) return stringValue === "true";
  return (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword
  );
}

function isVisuallyHiddenControl(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
) {
  const className =
    jsxAttribute(node, sourceFile, "className")?.initializer?.getText(sourceFile) ?? "";
  return classTokens(className).some((token) => token === "sr-only" || token === "hidden");
}

function hasVisibleText(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  if (ts.isJsxText(node)) return node.text.trim().length > 0;
  if (ts.isJsxExpression(node)) return node.expression
    ? hasVisibleText(node.expression, sourceFile)
    : false;
  if (ts.isJsxSelfClosingElement(node)) return false;
  if (ts.isJsxElement(node)) {
    if (
      isVisuallyHiddenControl(node.openingElement, sourceFile) ||
      hasAriaHidden(node.openingElement, sourceFile)
    ) {
      return false;
    }
    return node.children.some((child) => hasVisibleText(child, sourceFile));
  }
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text.trim().length > 0;
  }
  if (ts.isParenthesizedExpression(node)) {
    return hasVisibleText(node.expression, sourceFile);
  }
  if (ts.isConditionalExpression(node)) {
    return (
      hasVisibleText(node.whenTrue, sourceFile) ||
      hasVisibleText(node.whenFalse, sourceFile)
    );
  }
  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return hasVisibleText(node.right, sourceFile);
    }
    return hasVisibleText(node.left, sourceFile) || hasVisibleText(node.right, sourceFile);
  }
  if (
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.TrueKeyword
  ) {
    return false;
  }
  if (ts.isIdentifier(node) && node.text === "undefined") return false;
  return true;
}

function isIconOnlyControl(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
) {
  if (!ts.isJsxOpeningElement(node) || !ts.isJsxElement(node.parent)) return true;
  return !node.parent.children.some((child) => hasVisibleText(child, sourceFile));
}

const canonicalModules: Record<string, readonly string[]> = {
  AppIcon: ["AppIcon"],
  Badge: ["Badge", "badgeVariants"],
  BottomSheet: ["BottomSheet"],
  Button: ["Button", "buttonVariants"],
  ButtonLink: ["ButtonLink"],
  Checkbox: ["Checkbox"],
  CollapsibleSection: ["CollapsibleSection"],
  ConfirmDialog: ["ConfirmProvider", "useConfirm"],
  ErrorBoundary: ["ErrorBoundary"],
  FeedbackState: ["FeedbackState"],
  FormField: ["FormField"],
  IconButton: ["IconButton"],
  Input: ["Input"],
  InputAnchoredListbox: ["InputAnchoredListbox"],
  MetricCard: ["MetricCard"],
  Modal: ["Modal", "useModalRequestClose"],
  MobileActionDock: ["MobileActionDock"],
  ModalCancelButton: ["ModalCancelButton"],
  OverlaySurface: ["OverlaySurface"],
  Popover: ["Popover"],
  Progress: ["Progress"],
  Range: ["Range"],
  ResponsiveActions: ["ResponsiveActions"],
  SearchField: ["SearchField"],
  SearchablePicker: ["SearchablePicker"],
  Select: ["Select"],
  Skeleton: ["Skeleton"],
  Surface: ["Surface", "surfaceVariants"],
  StatChip: ["StatChip"],
  Switch: ["Switch"],
  SurfaceHeader: ["SurfaceHeader"],
  SymbolPicker: ["SymbolPicker"],
  Tabs: ["Tabs", "TabPanel", "tabId", "tabPanelId", "tabPanelAttributes", "tabPanelFocusClasses"],
  Textarea: ["Textarea"],
  Toast: ["ToastProvider", "useToast"],
};

test("the canonical design-system modules remain present and independently importable", () => {
  for (const [moduleName, expectedExports] of Object.entries(canonicalModules)) {
    const modulePath = resolve(repositoryRoot, "components", "ui", moduleName + ".tsx");
    expect(existsSync(modulePath), "Missing canonical primitive: " + moduleName).toBe(true);

    const exports = namedExports(parseSource(modulePath));
    for (const expectedExport of expectedExports) {
      expect(
        exports.has(expectedExport),
        moduleName + " must keep the named export " + expectedExport,
      ).toBe(true);
    }
  }

  expect(existsSync(resolve(repositoryRoot, "components", "ui", "index.ts"))).toBe(false);
  expect(existsSync(resolve(repositoryRoot, "components", "ui", "index.tsx"))).toBe(false);
  expect(existsSync(resolve(repositoryRoot, "components", "core"))).toBe(false);
});

test("source files cannot be empty or contain NUL bytes", () => {
  const emptyFiles = integrityFiles
    .filter((filePath) => statSync(filePath).size === 0)
    .map(normalizePath);
  const filesWithNulBytes = integrityFiles
    .filter((filePath) => readFileSync(filePath).includes(0))
    .map(normalizePath);

  expect(emptyFiles).toEqual([]);
  expect(filesWithNulBytes).toEqual([]);
});

test("the application shell stays isolated from the full symbol registry", () => {
  const shellFiles = [
    "components/layout/AppPageShell.tsx",
    "components/layout/BottomNav.tsx",
    "components/layout/ClientShell.tsx",
    "components/layout/FocusModeControl.tsx",
    "components/layout/NavigationIcon.tsx",
    "components/layout/Sidebar.tsx",
    "components/layout/navigation.ts",
  ].map((filePath) => resolve(repositoryRoot, filePath));
  const forbiddenImports: string[] = [];

  for (const filePath of shellFiles) {
    expect(existsSync(filePath), "Missing shell module: " + normalizePath(filePath)).toBe(true);
    const sourceFile = parseSource(filePath);
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const moduleName = statement.moduleSpecifier.text;
      if (
        moduleName.endsWith("/components/ui/AppIcon") ||
        moduleName.endsWith("/ui/AppIcon") ||
        moduleName.endsWith("/lib/symbols") ||
        moduleName === "@/components/ui/AppIcon" ||
        moduleName === "@/lib/symbols"
      ) {
        forbiddenImports.push(sourceLocation(sourceFile, statement));
      }
    }
  }

  expect(forbiddenImports).toEqual([]);
});

test("retired visual aliases and feature selectors cannot return", () => {
  expect(classTokenLocations(/^(?:glass(?:-hover)?|btn(?:--[\w-]+)?)$/)).toEqual([]);
  expect(
    findings(/\.(?:glass(?:-hover)?|btn(?:--[\w-]+)?)(?=[\s.:,{}>+~#\[])/g, stylesheetFiles),
  ).toEqual([]);

  for (const retiredSelector of [
    "chart-tooltip",
    "dropzone",
    "filter-panel",
    "finance-uploader",
    "tx-row",
  ]) {
    expect(
      findings(
        new RegExp(
          "\\." + retiredSelector + "(?:[\\w-]+)?(?=[\\s.:,{}>+~#\\[])",
          "g",
        ),
        stylesheetFiles,
      ),
      "." + retiredSelector + " must use canonical primitives instead",
    ).toEqual([]);
  }
});

test("motion utilities stay property-specific and use central duration tokens", () => {
  const stylesheet = readFileSync(resolve(repositoryRoot, "app", "globals.css"), "utf8");

  expect(classTokenLocations(/^transition$/)).toEqual([]);
  expect(classTokenLocations(/^transition-all$/)).toEqual([]);
  expect(classTokenLocations(/^duration-(?:75|100|150|200|300|500|700|1000)$/)).toEqual([]);
  expect(stylesheet).toContain("--default-transition-duration: var(--motion-fast);");
  expect(stylesheet).toContain("--default-transition-timing-function: var(--ease-standard);");
  expect(animationLiteralsWithoutReducedMotion()).toEqual([]);
});

test("compact typography stays on the canonical micro token", () => {
  const stylesheet = readFileSync(resolve(repositoryRoot, "app", "globals.css"), "utf8");

  expect(stylesheet).toMatch(/--text-micro:\s*0\.6875rem\s*;/);
  expect(classTokenLocations(/^text-\[(?:8|9|10|11)px\]$/)).toEqual([]);
});

test("text controls remain readable on iOS without sacrificing dense layouts", () => {
  const controls = readFileSync(resolve(repositoryRoot, "lib", "ui", "controlStyles.ts"), "utf8");

  expect(controls).toContain("text-base");
  expect(controls).toContain("sm:text-sm");
  expect(controls).toContain('compact: "text-base sm:text-xs"');
});

test("feature classes use semantic colors instead of physical Tailwind palettes", () => {
  const physicalPaletteClass = /^(?:bg|text|border|ring|outline|fill|stroke|from|via|to)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/.+)?$/;
  const arbitraryPhysicalColor = /^(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow)-\[(?:#|rgba?\()/;

  expect(classTokenLocations(physicalPaletteClass)).toEqual([]);
  expect(classTokenLocations(arbitraryPhysicalColor)).toEqual([]);
});

test("global stacking roles use named layer tokens", () => {
  const stylesheet = readFileSync(resolve(repositoryRoot, "app", "globals.css"), "utf8");
  for (const token of [
    "--layer-sticky",
    "--layer-shell",
    "--layer-action-dock",
    "--layer-popover",
    "--layer-navigation",
    "--layer-status",
    "--layer-skip-link",
    "--layer-toast",
  ]) {
    expect(stylesheet, "Missing stacking token " + token).toContain(token + ":");
  }

  expect(
    classTokenLocations(/^z-\[\d+\]$/).filter(
      (location) => !location.startsWith("components/ui/OverlaySurface.tsx:"),
    ),
  ).toEqual([]);
  expect(classTokenLocations(/^z-(?:30|40|50|60|70|80|90|100)$/)).toEqual([]);
});

test("secondary copy uses the contrast-safe semantic text tokens", () => {
  expect(findings(/\btext-slate-(?:500|600)\b/g)).toEqual([]);
  expect(findings(/var\(--color-bg\)/g)).toEqual([]);
  expect(findings(/style=\{\{\s*color\s*:/g)).toEqual([]);
});

test("semantic text tokens meet WCAG AA on their canonical surfaces", () => {
  const stylesheet = readFileSync(resolve(repositoryRoot, "app", "globals.css"), "utf8");
  const pairs = [
    ["--color-text", "--color-background"],
    ["--color-text-muted", "--color-background"],
    ["--color-text-subtle", "--color-background"],
    ["--color-document-preview-text", "--color-document-preview-surface"],
    ["--color-document-preview-text-muted", "--color-document-preview-surface"],
    ["--color-solid-foreground-dark", "--color-success"],
    ["--color-solid-foreground-dark", "--color-success-solid-hover"],
    ["--color-solid-foreground-dark", "--color-info"],
    ["--color-solid-foreground-dark", "--color-info-solid-hover"],
  ] as const;

  for (const [foregroundToken, backgroundToken] of pairs) {
    const foreground = fixedHexToken(stylesheet, foregroundToken);
    const background = fixedHexToken(stylesheet, backgroundToken);
    expect(
      contrastRatio(foreground, background),
      foregroundToken + " on " + backgroundToken + " must remain at least 4.5:1",
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("solid habit colours project a WCAG AA foreground", () => {
  const stylesheet = readFileSync(resolve(repositoryRoot, "app", "globals.css"), "utf8");
  const foregroundTokens: Record<string, string> = {
    "var(--color-solid-foreground-dark)": fixedHexToken(
      stylesheet,
      "--color-solid-foreground-dark",
    ),
    "var(--color-solid-foreground-light)": fixedHexToken(
      stylesheet,
      "--color-solid-foreground-light",
    ),
  };

  for (const color of HABIT_COLORS) {
    const foregroundToken = habitColorStyle(color)["--habit-color-foreground"];
    const foreground = foregroundTokens[foregroundToken];
    expect(foreground, "Unknown habit foreground token for " + color).toBeTruthy();
    expect(
      hexContrastRatio(foreground, color),
      "Habit foreground on " + color + " must remain at least 4.5:1",
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("raw controls and links declare safe interaction dimensions", () => {
  const missingTypes: string[] = [];
  const undersizedHeights: string[] = [];
  const undersizedIconWidths: string[] = [];

  for (const filePath of scriptFiles.filter((path) => path.endsWith(".tsx"))) {
    const sourceFile = parseSource(filePath);
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        const isButton = tagName === "button" || tagName === "motion.button";
        const isLink =
          (tagName === "a" || tagName === "motion.a" || tagName === "Link") &&
          Boolean(jsxAttribute(node, sourceFile, "href"));
        const isInput = tagName === "input";
        const inputType = isInput
          ? stringAttributeValue(jsxAttribute(node, sourceFile, "type"))?.toLowerCase()
          : null;
        const isFormControl =
          (isInput || tagName === "select" || tagName === "textarea") &&
          inputType !== "hidden" && inputType !== "file";

        if ((isButton || isLink || isFormControl) && !isVisuallyHiddenControl(node, sourceFile)) {
          const className = jsxAttribute(node, sourceFile, "className");
          const location = sourceLocation(sourceFile, node);

          if (isButton && !jsxAttribute(node, sourceFile, "type")) {
            missingTypes.push(location);
          }

          if (className) {
            const classSource = className.initializer?.getText(sourceFile) ?? "";
            if (
              encodesUndersizedDimension(classSource, "height") &&
              !hasSafeMinimumDimension(classSource, "height")
            ) {
              undersizedHeights.push(location);
            }
            if (
              (isButton || isLink) &&
              isIconOnlyControl(node, sourceFile) &&
              encodesUndersizedDimension(classSource, "width") &&
              !hasSafeMinimumDimension(classSource, "width")
            ) {
              undersizedIconWidths.push(location);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  expect(missingTypes).toEqual([]);
  expect(undersizedHeights).toEqual([]);
  expect(undersizedIconWidths).toEqual([]);
});

test("feature forms use canonical controls for regular fields", () => {
  const rawRegularControls: string[] = [];

  for (const filePath of scriptFiles.filter((path) => path.endsWith(".tsx"))) {
    if (normalizePath(filePath).startsWith("components/ui/")) continue;

    const sourceFile = parseSource(filePath);
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        if (tagName === "select" || tagName === "textarea") {
          rawRegularControls.push(sourceLocation(sourceFile, node));
        } else if (tagName === "input") {
          const inputType = stringAttributeValue(
            jsxAttribute(node, sourceFile, "type"),
          )?.toLowerCase();
          if (!inputType || !["color", "file", "hidden"].includes(inputType)) {
            rawRegularControls.push(sourceLocation(sourceFile, node));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  expect(rawRegularControls).toEqual([]);
});

test("feature control labels compose FormField except deliberate file-input triggers", () => {
  const rawRegularLabels: string[] = [];

  for (const filePath of scriptFiles.filter((path) => path.endsWith(".tsx"))) {
    if (normalizePath(filePath).startsWith("components/ui/")) continue;

    const sourceFile = parseSource(filePath);
    const fileInputIds = new Set<string>();
    const collectFileInputIds = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(sourceFile) === "input") {
          const inputType = stringAttributeValue(
            jsxAttribute(node, sourceFile, "type"),
          )?.toLowerCase();
          const idInitializer = jsxAttribute(node, sourceFile, "id")?.initializer;
          if (inputType === "file" && idInitializer) {
            fileInputIds.add(idInitializer.getText(sourceFile));
          }
        }
      }
      ts.forEachChild(node, collectFileInputIds);
    };
    ts.forEachChild(sourceFile, collectFileInputIds);

    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "label") {
        let containsFileInput = false;
        const inspectLabel = (child: ts.Node) => {
          if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
            if (child.tagName.getText(sourceFile) === "input") {
              const inputType = stringAttributeValue(
                jsxAttribute(child, sourceFile, "type"),
              )?.toLowerCase();
              if (inputType === "file") containsFileInput = true;
            }
          }
          ts.forEachChild(child, inspectLabel);
        };
        ts.forEachChild(node, inspectLabel);
        const htmlForInitializer = jsxAttribute(
          node.openingElement,
          sourceFile,
          "htmlFor",
        )?.initializer;
        const targetsFileInput = htmlForInitializer
          ? fileInputIds.has(htmlForInitializer.getText(sourceFile))
          : false;

        if (!containsFileInput && !targetsFileInput) {
          rawRegularLabels.push(sourceLocation(sourceFile, node.openingElement));
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  expect(rawRegularLabels).toEqual([]);
});

test("shared surface composition does not fork into domain Panel or TabBar primitives", () => {
  const panelExports = scriptFiles.flatMap((filePath) => {
    const sourceFile = parseSource(filePath);
    return namedExports(sourceFile).has("Panel") ? [normalizePath(filePath)] : [];
  });
  expect(panelExports).toEqual([]);

  expect(existsSync(resolve(repositoryRoot, "components", "schedule", "TabBar.tsx"))).toBe(false);

  const oldTabBarImports = scriptFiles.flatMap((filePath) => {
    const sourceFile = parseSource(filePath);
    const locations: string[] = [];
    for (const statement of sourceFile.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        (statement.moduleSpecifier.text.includes("components/schedule/TabBar") ||
          (normalizePath(filePath).startsWith("components/schedule/") &&
            /^(?:\.\/|\.\.\/).*TabBar$/.test(statement.moduleSpecifier.text)))
      ) {
        locations.push(sourceLocation(sourceFile, statement));
      }
    }
    return locations;
  });
  expect(oldTabBarImports).toEqual([]);
});

test("new public design-system APIs use semantic tone names", () => {
  const physicalToneNames = new Set([
    "amber",
    "orange",
    "yellow",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
    "red",
    "slate",
    "gray",
    "zinc",
    "stone",
  ]);
  const physicalPublicTones: string[] = [];

  for (const filePath of scriptFiles) {
    const path = normalizePath(filePath);
    if (
      !path.startsWith("components/ui/") && !path.startsWith("lib/ui/")
    ) {
      continue;
    }

    const sourceFile = parseSource(filePath);
    const inspectType = (node: ts.Node | undefined) => {
      if (!node) return;
      const visit = (child: ts.Node) => {
        if (
          ts.isLiteralTypeNode(child) &&
          ts.isStringLiteral(child.literal) &&
          physicalToneNames.has(child.literal.text)
        ) {
          physicalPublicTones.push(sourceLocation(sourceFile, child));
        }
        ts.forEachChild(child, visit);
      };
      visit(node);
    };

    for (const statement of sourceFile.statements) {
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
        inspectType(statement);
      } else if (hasExportModifier(statement) && ts.isFunctionDeclaration(statement)) {
        statement.parameters.forEach((parameter) => inspectType(parameter.type));
        inspectType(statement.type);
      } else if (hasExportModifier(statement) && ts.isVariableStatement(statement)) {
        statement.declarationList.declarations.forEach((declaration) =>
          inspectType(declaration.type),
        );
      }
    }
  }

  expect(physicalPublicTones).toEqual([]);
});

test("motion-sensitive scrolling goes through the reduced-motion helper", () => {
  expect(
    findings(/behavior\s*:\s*["']smooth["']/g).filter(
      (location) => !location.startsWith("lib/ui/scroll.ts:"),
    ),
  ).toEqual([]);
});
test("feature tab panels compose the canonical TabPanel contract", () => {
  expect(
    findings(/\brole\s*=\s*["']tabpanel["']/g).filter(
      (location) => !location.startsWith("components/ui/Tabs.tsx:"),
    ),
  ).toEqual([]);
});
test("generic elements cannot expose an aria-label without a semantic role", () => {
  const invalidElements: string[] = [];

  for (const filePath of scriptFiles) {
    const sourceFile = parseSource(filePath);
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        if (tagName === "div" || tagName === "span") {
          const attributeNames = new Set(
            node.attributes.properties
              .filter(ts.isJsxAttribute)
              .map((attribute) => attribute.name.getText(sourceFile)),
          );
          if (attributeNames.has("aria-label") && !attributeNames.has("role")) {
            invalidElements.push(sourceLocation(sourceFile, node));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }

  expect(invalidElements).toEqual([]);
});
