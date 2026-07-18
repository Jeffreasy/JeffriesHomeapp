interface PrivacyVisibilityInput {
  isServerUnknown: boolean;
  localOverride: boolean | null;
  remoteHidden: boolean;
}

/**
 * Privacy is fail-closed: an unknown persisted preference always masks data.
 * A local eye-toggle only applies after the server preference is trustworthy.
 */
export function resolvePrivacyHidden({
  isServerUnknown,
  localOverride,
  remoteHidden,
}: PrivacyVisibilityInput) {
  return isServerUnknown ? true : (localOverride ?? remoteHidden);
}
