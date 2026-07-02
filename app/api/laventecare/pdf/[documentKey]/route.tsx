import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaventeCarePdfDocument } from "@/components/laventecare/pdf/LaventeCarePdfDocument";
import { registerLaventeCarePdfFonts } from "@/lib/laventecare/pdf/fonts";
import {
  getLaventeCarePdfDocument,
  getLaventeCarePdfFilename,
} from "@/lib/laventecare/pdf/registry";
import { parseLaventeCarePdfDossierContext } from "@/lib/laventecare/pdf/context";
import { isLaventeCarePdfTheme } from "@/lib/laventecare/pdf/theme";
import { auth } from "@clerk/nextjs/server";
import {
  createLaventeCarePdfErrorResponse,
  createLaventeCarePdfRequestId,
  createLaventeCarePdfResponse,
} from "@/lib/laventecare/pdf/responses";

const OWNER_USER_ID =
  process.env.HOMEAPP_OWNER_USER_ID ?? "user_3Ax561ZvuSkGtWpKFooeY65HNtY";

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
  if (userId !== OWNER_USER_ID) {
    return createLaventeCarePdfErrorResponse("Geen toegang", 403, requestId);
  }

  const startedAt = Date.now();

  const { documentKey } = await context.params;
  const url = new URL(request.url);
  const themeParam = url.searchParams.get("theme");
  const theme = isLaventeCarePdfTheme(themeParam) ? themeParam : "screen";
  const delivery = url.searchParams.get("delivery") === "download" ? "download" : "inline";
  const dossierContext = parseLaventeCarePdfDossierContext(url.searchParams);
  const document = getLaventeCarePdfDocument(documentKey);

  if (!document) {
    return createLaventeCarePdfErrorResponse("LaventeCare document niet gevonden", 404, requestId);
  }

  try {
    const fontRegistration = registerLaventeCarePdfFonts();

    const buffer = await renderToBuffer(
      <LaventeCarePdfDocument
        document={document}
        theme={theme}
        generatedAt={new Date()}
        dossierContext={dossierContext}
        fontFamilies={fontRegistration.families}
      />
    );
    const filename = getLaventeCarePdfFilename(document, theme);

    console.info("laventecare pdf generated", {
      requestId,
      documentKey,
      theme,
      delivery,
      dossierContext: dossierContext?.kind ?? null,
      fontSource: fontRegistration.source,
      missingFontFiles: fontRegistration.missingFiles,
      bytes: buffer.byteLength,
      durationMs: Date.now() - startedAt,
    });

    return createLaventeCarePdfResponse({
      buffer,
      filename,
      inline: delivery === "inline",
      requestId,
    });
  } catch (error) {
    console.error("laventecare pdf generation failed", {
      requestId,
      documentKey,
      theme,
      delivery,
      dossierContext: dossierContext?.kind ?? null,
      durationMs: Date.now() - startedAt,
      error: serializeLaventeCarePdfError(error),
    });

    return createLaventeCarePdfErrorResponse("PDF generatie mislukt", 500, requestId);
  }
}

function serializeLaventeCarePdfError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}
