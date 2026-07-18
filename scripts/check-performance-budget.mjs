import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextDirectory = resolve(repositoryRoot, ".next");
const serverAppDirectory = resolve(nextDirectory, "server", "app");
const budgetPath = resolve(repositoryRoot, "performance-budget.json");
const budget = readJson(budgetPath, "performance budget");
const failures = [];

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${relative(repositoryRoot, filePath)}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function walkFiles(directory, predicate) {
  if (!existsSync(directory)) return [];

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(entryPath, predicate));
    else if (entry.isFile() && predicate(entryPath)) files.push(entryPath);
  }
  return files.sort((first, second) => first.localeCompare(second));
}

function resolveBuildAsset(assetReference) {
  const normalized = assetReference.replaceAll("\\", "/");
  const candidates = [normalized];
  try {
    const decoded = decodeURIComponent(normalized);
    if (decoded !== normalized) candidates.push(decoded);
  } catch {
    throw new Error(`Invalid encoded build asset path: ${assetReference}`);
  }

  for (const candidate of candidates) {
    const assetPath = resolve(nextDirectory, candidate);
    const relativePath = relative(nextDirectory, assetPath);
    if (relativePath.startsWith(`..${sep}`) || relativePath === ".." || isAbsolute(relativePath)) {
      throw new Error(`Build asset escapes .next: ${assetReference}`);
    }
    if (existsSync(assetPath)) return assetPath;
  }

  throw new Error(`Build manifest references a missing asset: ${assetReference}`);
}

function measureFiles(files) {
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const filePath of new Set(files)) {
    const contents = readFileSync(filePath);
    rawBytes += contents.byteLength;
    gzipBytes += gzipSync(contents, { level: 9 }).byteLength;
  }
  return { rawKiB: rawBytes / 1024, gzipKiB: gzipBytes / 1024 };
}

function parseClientReferenceManifest(filePath) {
  const source = readFileSync(filePath, "utf8");
  const assignmentMarker = source.indexOf("]={");
  if (assignmentMarker < 0) {
    throw new Error(`Unsupported client-reference manifest format: ${relative(repositoryRoot, filePath)}`);
  }

  const jsonSource = source.slice(assignmentMarker + 2).trim().replace(/;$/, "");
  const manifest = JSON.parse(jsonSource);
  const assetReferences = new Set();

  for (const moduleReference of Object.values(manifest.clientModules ?? {})) {
    for (const chunk of moduleReference.chunks ?? []) {
      if (typeof chunk === "string" && chunk.endsWith(".js")) assetReferences.add(chunk);
    }
  }

  return measureFiles([...assetReferences].map(resolveBuildAsset));
}

function routeFromManifestPath(filePath) {
  const relativePath = relative(serverAppDirectory, filePath).split(sep).join("/");
  const rootManifest = "page_client-reference-manifest.js";
  const suffix = `/${rootManifest}`;
  if (relativePath === rootManifest) return "/";
  if (!relativePath.endsWith(suffix)) {
    throw new Error(`Unexpected client-reference manifest path: ${relativePath}`);
  }
  return `/${relativePath.slice(0, -suffix.length)}`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function checkMaximum(label, actual, maximum) {
  if (!Number.isFinite(maximum)) {
    failures.push(`${label} has no numeric budget.`);
    return;
  }
  if (actual > maximum) {
    failures.push(`${label}: ${round(actual)} KiB exceeds ${maximum} KiB.`);
  }
}

if (!existsSync(serverAppDirectory)) {
  throw new Error("Missing .next production artifacts. Run `npm run build` before this check.");
}

const buildManifest = readJson(resolve(nextDirectory, "build-manifest.json"), "Next.js build manifest");
const rootMain = measureFiles((buildManifest.rootMainFiles ?? []).map(resolveBuildAsset));
checkMaximum("Shared root-main gzip", rootMain.gzipKiB, budget.rootMainGzipKiB);

const cssFiles = walkFiles(resolve(nextDirectory, "static", "css"), (filePath) => filePath.endsWith(".css"));
const globalCss = measureFiles(cssFiles);
checkMaximum("Generated CSS gzip", globalCss.gzipKiB, budget.globalCssGzipKiB);

const chunkFiles = walkFiles(resolve(nextDirectory, "static", "chunks"), (filePath) => filePath.endsWith(".js"));
if (chunkFiles.length === 0) throw new Error("No generated JavaScript chunks found in .next/static/chunks.");

const measuredChunks = chunkFiles.map((filePath) => ({
  filePath,
  ...measureFiles([filePath]),
}));
const largestRawChunk = measuredChunks.reduce((largest, chunk) =>
  chunk.rawKiB > largest.rawKiB ? chunk : largest,
);
const largestGzipChunk = measuredChunks.reduce((largest, chunk) =>
  chunk.gzipKiB > largest.gzipKiB ? chunk : largest,
);
checkMaximum("Largest raw JavaScript chunk", largestRawChunk.rawKiB, budget.maxChunkRawKiB);
checkMaximum("Largest gzip JavaScript chunk", largestGzipChunk.gzipKiB, budget.maxChunkGzipKiB);

const routeMeasurements = new Map();
for (const manifestPath of walkFiles(
  serverAppDirectory,
  (filePath) => filePath.endsWith("page_client-reference-manifest.js"),
)) {
  routeMeasurements.set(routeFromManifestPath(manifestPath), parseClientReferenceManifest(manifestPath));
}

const routeBudgetOverrides = budget.routeClientGzipKiB ?? {};
for (const route of Object.keys(routeBudgetOverrides)) {
  if (!routeMeasurements.has(route)) {
    failures.push(`Configured route was not found in the production build: ${route}`);
  }
}

const routeRows = [];
for (const [route, measurement] of [...routeMeasurements.entries()].sort(([first], [second]) =>
  first.localeCompare(second),
)) {
  const maximum = routeBudgetOverrides[route] ?? budget.defaultRouteClientGzipKiB;
  checkMaximum(`${route} client-assets gzip`, measurement.gzipKiB, maximum);
  routeRows.push({
    route,
    rawKiB: round(measurement.rawKiB),
    gzipKiB: round(measurement.gzipKiB),
    budgetKiB: maximum,
    status: Number.isFinite(maximum) && measurement.gzipKiB <= maximum ? "ok" : "over",
  });
}

console.log("Performance budget report (generated assets, KiB)");
console.table(routeRows);
console.log(
  `Shared root main: ${round(rootMain.rawKiB)} raw / ${round(rootMain.gzipKiB)} gzip; ` +
    `CSS: ${round(globalCss.rawKiB)} raw / ${round(globalCss.gzipKiB)} gzip.`,
);
console.log(
  `Largest raw chunk: ${relative(nextDirectory, largestRawChunk.filePath)} (${round(largestRawChunk.rawKiB)} KiB).`,
);
console.log(
  `Largest gzip chunk: ${relative(nextDirectory, largestGzipChunk.filePath)} (${round(largestGzipChunk.gzipKiB)} KiB).`,
);

if (failures.length > 0) {
  console.error("\nPerformance budget violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("All performance budgets passed.");
}
