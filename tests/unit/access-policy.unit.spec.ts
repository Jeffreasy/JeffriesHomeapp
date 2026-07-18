import { expect, test } from "@playwright/test";
import {
  decideOwnerAccess,
  getSafePageReturnPath,
  isApiAccessPath,
  isPublicAccessPath,
} from "../../lib/server/access-policy";

test("only explicit auth and denial routes are public", () => {
  expect(isPublicAccessPath("/sign-in")).toBe(true);
  expect(isPublicAccessPath("/sign-in/factor-one")).toBe(true);
  expect(isPublicAccessPath("/access-denied")).toBe(true);
  expect(isPublicAccessPath("/access-denied/help")).toBe(true);

  expect(isPublicAccessPath("/sign-up")).toBe(false);
  expect(isPublicAccessPath("/sign-in-legacy")).toBe(false);
  expect(isPublicAccessPath("/")).toBe(false);
});

test("API classification respects complete path segments", () => {
  expect(isApiAccessPath("/api")).toBe(true);
  expect(isApiAccessPath("/api/backend/health")).toBe(true);
  expect(isApiAccessPath("/trpc")).toBe(true);
  expect(isApiAccessPath("/trpc/devices.list")).toBe(true);
  expect(isApiAccessPath("/apiary")).toBe(false);
});

test("owner access matrix fails closed for every protected resource", () => {
  const cases = [
    {
      name: "public route without a session",
      input: { pathname: "/sign-in", userId: null, isOwner: false },
      expected: { outcome: "allow", reason: "public" },
    },
    {
      name: "private page without a session",
      input: { pathname: "/lampen", userId: null, isOwner: false },
      expected: { outcome: "unauthenticated", resource: "page" },
    },
    {
      name: "private API without a session",
      input: { pathname: "/api/backend/devices", userId: undefined, isOwner: false },
      expected: { outcome: "unauthenticated", resource: "api" },
    },
    {
      name: "private page for a non-owner",
      input: { pathname: "/finance", userId: "user_other", isOwner: false },
      expected: { outcome: "forbidden", resource: "page" },
    },
    {
      name: "private API for a non-owner",
      input: { pathname: "/api/backend/privacy", userId: "user_other", isOwner: false },
      expected: { outcome: "forbidden", resource: "api" },
    },
    {
      name: "private page for the owner",
      input: { pathname: "/", userId: "user_owner", isOwner: true },
      expected: { outcome: "allow", reason: "owner" },
    },
    {
      name: "private API for the owner",
      input: { pathname: "/api/backend/devices", userId: "user_owner", isOwner: true },
      expected: { outcome: "allow", reason: "owner" },
    },
  ] as const;

  for (const { name, input, expected } of cases) {
    expect(decideOwnerAccess(input), name).toEqual(expected);
  }
});

test("post-login redirects remain relative and omit query or hash data", () => {
  expect(getSafePageReturnPath("/finance?account=private#details")).toBe("/finance");
  expect(getSafePageReturnPath("/lampen")).toBe("/lampen");
  expect(getSafePageReturnPath("/sign-up")).toBe("/");
  expect(getSafePageReturnPath("/access-denied")).toBe("/");
  expect(getSafePageReturnPath("https://example.com/private")).toBe("/");
  expect(getSafePageReturnPath("//example.com/private")).toBe("/");
  expect(getSafePageReturnPath("/\\example.com/private")).toBe("/");
});
