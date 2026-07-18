export type SafeRuntimeSource =
  | { scope: "first-party"; area: "next" | "api" | "service-worker" | "page" | "other" }
  | { scope: "dependency"; provider: "clerk" | "vercel" | "other" }
  | { scope: "unknown" };

export type SafeRuntimeMessageCategory =
  | "type-error"
  | "reference-error"
  | "syntax-error"
  | "range-error"
  | "chunk-load"
  | "network"
  | "react"
  | "other";

type SafeRuntimeStackSummary = {
  frameCount: number;
  firstPartyFrameCount: number;
  dependencyProviders: Array<"clerk" | "vercel" | "other">;
};

export type SafeRuntimeDiagnostic = {
  messageCategory: SafeRuntimeMessageCategory;
  source: SafeRuntimeSource;
  stack?: SafeRuntimeStackSummary;
};

const MAX_MESSAGE_INPUT_LENGTH = 4_000;
const MAX_STACK_LINES_TO_INSPECT = 24;
const MAX_STACK_INPUT_LENGTH = 16_000;

function firstPartyArea(pathname: string): Extract<SafeRuntimeSource, { scope: "first-party" }>["area"] {
  if (pathname.startsWith("/_next/")) return "next";
  if (pathname.startsWith("/api/")) return "api";
  if (pathname === "/sw.js" || pathname.startsWith("/serwist/")) return "service-worker";
  if (pathname === "/" || !pathname.includes(".")) return "page";
  return "other";
}

export function classifyRuntimeMessage(value: string): SafeRuntimeMessageCategory {
  const boundedValue = value.slice(0, MAX_MESSAGE_INPUT_LENGTH);

  if (/\bChunkLoadError\b|loading chunk\b/iu.test(boundedValue)) return "chunk-load";
  if (/\bnetwork\b|\bfetch\b|\bERR_[A-Z_]+\b/iu.test(boundedValue)) return "network";
  if (/\bTypeError\b|cannot read (?:properties|property)/iu.test(boundedValue)) {
    return "type-error";
  }
  if (/\bReferenceError\b|is not defined\b/iu.test(boundedValue)) return "reference-error";
  if (/\bSyntaxError\b|unexpected token\b/iu.test(boundedValue)) return "syntax-error";
  if (/\bRangeError\b|maximum call stack/iu.test(boundedValue)) return "range-error";
  if (/\breact\b|\bhydration\b/iu.test(boundedValue)) return "react";
  return "other";
}

export function inferRuntimeSource(
  rawUrl: string | undefined,
  firstPartyOrigin: string,
): SafeRuntimeSource {
  if (!rawUrl) return { scope: "unknown" };

  try {
    const parsed = new URL(rawUrl);
    if (parsed.origin === firstPartyOrigin) {
      return {
        scope: "first-party",
        area: firstPartyArea(parsed.pathname),
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes("clerk")) {
      return { scope: "dependency", provider: "clerk" };
    }
    if (hostname.includes("vercel")) {
      return { scope: "dependency", provider: "vercel" };
    }
    return { scope: "dependency", provider: "other" };
  } catch {
    return { scope: "unknown" };
  }
}

function sourceUrlFromStackLine(line: string): string | undefined {
  return line.match(/https?:\/\/[^\s)]+/u)?.[0];
}

function summarizeStack(
  stack: string | undefined,
  firstPartyOrigin: string,
): SafeRuntimeStackSummary | undefined {
  const lines = stack
    ?.slice(0, MAX_STACK_INPUT_LENGTH)
    .split(/\r?\n/u)
    .filter(Boolean)
    .slice(0, MAX_STACK_LINES_TO_INSPECT);
  if (!lines || lines.length === 0) return undefined;

  let firstPartyFrameCount = 0;
  const dependencyProviders = new Set<"clerk" | "vercel" | "other">();

  for (const line of lines) {
    const source = inferRuntimeSource(sourceUrlFromStackLine(line), firstPartyOrigin);
    if (source.scope === "first-party") {
      firstPartyFrameCount += 1;
    } else if (source.scope === "dependency") {
      dependencyProviders.add(source.provider);
    }
  }

  return {
    frameCount: lines.length,
    firstPartyFrameCount,
    dependencyProviders: [...dependencyProviders].sort(),
  };
}

export function sanitizeRuntimeDiagnostic({
  message,
  sourceUrl,
  stack,
  firstPartyOrigin,
}: {
  message: string;
  sourceUrl?: string;
  stack?: string;
  firstPartyOrigin: string;
}): SafeRuntimeDiagnostic {
  const stackSummary = summarizeStack(stack, firstPartyOrigin);

  return {
    messageCategory: classifyRuntimeMessage(message),
    source: inferRuntimeSource(
      sourceUrl ?? sourceUrlFromStackLine(stack?.slice(0, MAX_STACK_INPUT_LENGTH) ?? ""),
      firstPartyOrigin,
    ),
    ...(stackSummary ? { stack: stackSummary } : {}),
  };
}
