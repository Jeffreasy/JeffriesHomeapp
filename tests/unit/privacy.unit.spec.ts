import { expect, test } from "@playwright/test";
import { resolvePrivacyHidden } from "../../lib/privacy";

test("privacy fails closed while the server preference is unknown", () => {
  expect(
    resolvePrivacyHidden({
      isServerUnknown: true,
      localOverride: false,
      remoteHidden: false,
    }),
  ).toBe(true);
});

test("a trusted local override wins after settings load", () => {
  expect(
    resolvePrivacyHidden({
      isServerUnknown: false,
      localOverride: true,
      remoteHidden: false,
    }),
  ).toBe(true);
  expect(
    resolvePrivacyHidden({
      isServerUnknown: false,
      localOverride: false,
      remoteHidden: true,
    }),
  ).toBe(false);
});

test("the remote preference is used without a local override", () => {
  expect(
    resolvePrivacyHidden({
      isServerUnknown: false,
      localOverride: null,
      remoteHidden: true,
    }),
  ).toBe(true);
});
