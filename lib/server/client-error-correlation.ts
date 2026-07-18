import { createHash } from "node:crypto";

const DIGEST_PATTERN = /^[0-9a-f]{6,64}$/i;
const BUILD_ID_PATTERN = /^(?:[0-9a-f]{7,64}|[0-9]{10,16})$/i;

export function correlateClientDigest(value: string | undefined) {
  if (!value || !DIGEST_PATTERN.test(value)) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function getServerBuildId(
  value = process.env.NEXT_PUBLIC_BUILD_ID,
): string | undefined {
  return value && BUILD_ID_PATTERN.test(value) ? value : undefined;
}
