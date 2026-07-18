import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@clerk/nextjs/server";
import { LaventeCarePdfDocument } from "@/components/laventecare/pdf/LaventeCarePdfDocument";
import { registerLaventeCarePdfFonts } from "@/lib/laventecare/pdf/fonts";
import {
  getLaventeCarePdfDocument,
  getLaventeCarePdfFilename,
} from "@/lib/laventecare/pdf/registry";
import { parseLaventeCarePdfDossierReference } from "@/lib/laventecare/pdf/context";
import { resolveLaventeCarePdfDossierContextResult } from "@/lib/server/laventecare-pdf-context";
import { isLaventeCarePdfTheme } from "@/lib/laventecare/pdf/theme";
import { isOwnerUserId } from "@/lib/server/owner-config";
import { getErrorKind } from "@/lib/server/telemetry";
import {
  createLaventeCarePdfErrorResponse,
  createLaventeCarePdfRequestId,
  createLaventeCarePdfResponse,
} from "@/lib/laventecare/pdf/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    documentKey: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = createLaventeCarePdfRequestId();
  const { userId } = await auth();
  if (!userId) {
    return createLaventeCarePdfErrorResponse("Niet ingelogd", 401, requestId);
  }
  if (!isOwnerUserId(userId)) {
    return createLaventeCarePdfErrorResponse("Geen toegang", 403, requestId);
  }

  const startedAt = Date.now();
  const { documentKey } = await context.params;
  const url = new URL(request.url);
  const themeParam = url.searchParams.get("theme");
  const theme = isLaventeCarePdfTheme(themeParam) ? themeParam : "screen";
  const delivery = url.searchParams.get("delivery") === "download" ? "download" : "inline";
  const dossierReference = parseLaventeCarePdfDossierReference(url.searchParams);
  const document = getLaventeCarePdfDocument(documentKey);

  if (!document) {
    return createLaventeCarePdfErrorResponse("LaventeCare document niet gevonden", 404, requestId);
  }

  const contextResolution = await resolveLaventeCarePdfDossierContextResult(
    dossierReference,
    userId,
  );
  if (dossierReference && contextResolution.status === "not_found") {
    return createLaventeCarePdfErrorResponse("Dossiercontext niet gevonden", 404, requestId);
  }
  if (dossierReference && contextResolution.status === "unavailable") {
    return createLaventeCarePdfErrorResponse("Dossiercontext tijdelijk niet beschikbaar", 503, requestId);
  }
  const dossierContext =
    contextResolution.status === "resolved" ? contextResolution.context : null;

  try {
    const fontRegistration = registerLaventeCarePdfFonts();

    const buffer = await renderToBuffer(
      <LaventeCarePdfDocument
        document={document}
        theme={theme}
        generatedAt={new Date()}
        dossierContext={dossierContext}
        fontFamilies={fontRegistration.families}
      />,
    );
    const filename = getLaventeCarePdfFilename(document, theme);

    console.info(
      JSON.stringify({
        level: "info",
        event: "laventecare_pdf_generated",
        requestId,
        documentKey,
        theme,
        delivery,
        dossierContext: dossierContext?.kind ?? null,
        fontSource: fontRegistration.source,
        missingFontFileCount: fontRegistration.missingFileCount,
        bytes: buffer.byteLength,
        durationMs: Date.now() - startedAt,
      }),
    );

    return createLaventeCarePdfResponse({
      buffer,
      filename,
      inline: delivery === "inline",
      requestId,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "laventecare_pdf_generation_failed",
        requestId,
        documentKey,
        theme,
        delivery,
        dossierContext: dossierContext?.kind ?? null,
        durationMs: Date.now() - startedAt,
        errorName: getErrorKind(error),
      }),
    );

    return createLaventeCarePdfErrorResponse("PDF generatie mislukt", 500, requestId);
  }
}
