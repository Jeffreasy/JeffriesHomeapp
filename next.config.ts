import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Attach a non-sensitive release identifier to allowlisted telemetry events.
  // Evaluated at build time, so no live server or provider data is exposed.
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
