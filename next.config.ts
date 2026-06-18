import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
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
