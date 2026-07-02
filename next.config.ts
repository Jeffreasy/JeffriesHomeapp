import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Give the persisted-cache buster (app/providers.tsx) a real per-build value.
  // Evaluated at build time in the Node config context (not shipped to the
  // client as a live call), so Date.now() is a fine last-resort fallback when
  // no CI commit SHA is present.
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT ?? String(Date.now()),
  },
  outputFileTracingIncludes: {
    "/api/laventecare/pdf/[documentKey]": [
      "./node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff",
      "./node_modules/@fontsource/outfit/files/outfit-latin-600-normal.woff",
      "./node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-500-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-600-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default withSerwist(nextConfig);
