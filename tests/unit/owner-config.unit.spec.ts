import { expect, test } from "@playwright/test";
import { getOwnerUserId, isOwnerUserId } from "../../lib/server/owner-config";

test("production requires an explicit owner id", () => {
  expect(() => getOwnerUserId({ NODE_ENV: "production" })).toThrow(
    /HOMEAPP_OWNER_USER_ID/,
  );
  expect(isOwnerUserId("user_someone", { NODE_ENV: "production" })).toBe(false);
});

test("development keeps the single-owner local fallback", () => {
  const ownerId = getOwnerUserId({ NODE_ENV: "development" });
  expect(ownerId).toMatch(/^user_/);
  expect(isOwnerUserId(ownerId, { NODE_ENV: "development" })).toBe(true);
  expect(isOwnerUserId("user_someone_else", { NODE_ENV: "development" })).toBe(false);
  expect(isOwnerUserId(null, { NODE_ENV: "development" })).toBe(false);
});

test("an explicit owner id is trimmed and shared by every server surface", () => {
  const env = {
    NODE_ENV: "production",
    HOMEAPP_OWNER_USER_ID: " user_configured_owner ",
  };
  expect(getOwnerUserId(env)).toBe("user_configured_owner");
  expect(isOwnerUserId("user_configured_owner", env)).toBe(true);
});