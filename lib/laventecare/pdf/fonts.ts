import { Font } from "@react-pdf/renderer";
import path from "node:path";

let fontsRegistered = false;

function resolveFontPath(packageName: string, fileName: string) {
  return path.join(process.cwd(), "node_modules", "@fontsource", packageName, "files", fileName);
}

export function registerLaventeCarePdfFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "Outfit",
    fonts: [
      { src: resolveFontPath("outfit", "outfit-latin-400-normal.woff"), fontWeight: 400 },
      { src: resolveFontPath("outfit", "outfit-latin-600-normal.woff"), fontWeight: 600 },
      { src: resolveFontPath("outfit", "outfit-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });

  Font.register({
    family: "Inter",
    fonts: [
      { src: resolveFontPath("inter", "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: resolveFontPath("inter", "inter-latin-500-normal.woff"), fontWeight: 500 },
      { src: resolveFontPath("inter", "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: resolveFontPath("inter", "inter-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

