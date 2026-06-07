import { Font } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import {
  LAVENTECARE_PDF_FONTS,
  LAVENTECARE_PDF_STANDARD_FONTS,
  type LaventeCarePdfFontFamilies,
} from "@/lib/laventecare/pdf/theme";

let fontsRegistered = false;
let activeFontFamilies: LaventeCarePdfFontFamilies = LAVENTECARE_PDF_FONTS;

type LaventeCarePdfFontRegistration = {
  families: LaventeCarePdfFontFamilies;
  source: "custom" | "standard";
  missingFiles: string[];
};

function resolveFontPath(packageName: string, fileName: string) {
  return path.join(process.cwd(), "node_modules", "@fontsource", packageName, "files", fileName);
}

function fontFile(packageName: string, fileName: string, fontWeight: number) {
  return {
    src: resolveFontPath(packageName, fileName),
    fontWeight,
  };
}

function missingFontFiles(fonts: Array<{ src: string }>) {
  return fonts.filter((font) => !fs.existsSync(font.src)).map((font) => path.basename(font.src));
}

export function registerLaventeCarePdfFonts(): LaventeCarePdfFontRegistration {
  if (fontsRegistered) {
    return {
      families: activeFontFamilies,
      source: activeFontFamilies === LAVENTECARE_PDF_FONTS ? "custom" : "standard",
      missingFiles: [],
    };
  }

  const outfitFonts = [
    fontFile("outfit", "outfit-latin-400-normal.woff", 400),
    fontFile("outfit", "outfit-latin-600-normal.woff", 600),
    fontFile("outfit", "outfit-latin-700-normal.woff", 700),
  ];
  const interFonts = [
    fontFile("inter", "inter-latin-400-normal.woff", 400),
    fontFile("inter", "inter-latin-500-normal.woff", 500),
    fontFile("inter", "inter-latin-600-normal.woff", 600),
    fontFile("inter", "inter-latin-700-normal.woff", 700),
  ];
  const missingFiles = missingFontFiles([...outfitFonts, ...interFonts]);

  Font.registerHyphenationCallback((word) => [word]);

  if (missingFiles.length > 0) {
    activeFontFamilies = LAVENTECARE_PDF_STANDARD_FONTS;
    fontsRegistered = true;

    console.warn("laventecare pdf custom fonts missing, using standard fonts", {
      missingFiles,
    });

    return {
      families: activeFontFamilies,
      source: "standard",
      missingFiles,
    };
  }

  try {
    Font.register({
      family: LAVENTECARE_PDF_FONTS.title,
      fonts: outfitFonts,
    });

    Font.register({
      family: LAVENTECARE_PDF_FONTS.body,
      fonts: interFonts,
    });

    activeFontFamilies = LAVENTECARE_PDF_FONTS;
    fontsRegistered = true;

    return {
      families: activeFontFamilies,
      source: "custom",
      missingFiles: [],
    };
  } catch (error) {
    activeFontFamilies = LAVENTECARE_PDF_STANDARD_FONTS;
    fontsRegistered = true;

    console.warn("laventecare pdf custom font registration failed, using standard fonts", {
      error,
    });

    return {
      families: activeFontFamilies,
      source: "standard",
      missingFiles,
    };
  }
}
