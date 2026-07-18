import { expect, test } from "@playwright/test";
import {
  enforceOptionalOwnerJsonBody,
  enforceOwnerJsonBody,
  enforceOwnerQuery,
  isJsonRequestContentType,
  shouldRejectProxyMutationBody,
} from "../../lib/server/proxy-owner";

test("query ownership removes snake_case spoofing and overwrites camelCase", () => {
  const query = new URLSearchParams("userId=attacker&user_id=attacker&limit=10");
  enforceOwnerQuery(query, "owner");
  expect(query.get("userId")).toBe("owner");
  expect(query.has("user_id")).toBe(false);
  expect(query.get("limit")).toBe("10");
});

test("JSON ownership overwrites top-level and nested identity fields", () => {
  const rewritten = JSON.parse(
    enforceOwnerJsonBody('{"user_id":"attacker","nested":{"userId":"attacker"}}', "owner"),
  );
  expect(rewritten).toMatchObject({
    userId: "owner",
    user_id: "owner",
    nested: { userId: "owner" },
  });
});

test("only JSON mutation bodies may pass the owner-rewriting proxy", () => {
  expect(isJsonRequestContentType("application/json; charset=utf-8")).toBe(true);
  expect(isJsonRequestContentType("application/merge-patch+json")).toBe(true);
  expect(isJsonRequestContentType("text/not-json")).toBe(false);
  expect(shouldRejectProxyMutationBody("multipart/form-data; boundary=x", 128)).toBe(true);
  expect(shouldRejectProxyMutationBody("application/x-www-form-urlencoded", 10)).toBe(true);
  expect(shouldRejectProxyMutationBody("", 0)).toBe(false);
});

test("bodyless JSON mutations remain valid without forwarding an identity", () => {
  expect(enforceOptionalOwnerJsonBody("  \n", "owner")).toBeUndefined();
  expect(
    JSON.parse(enforceOptionalOwnerJsonBody('{"name":"keuken"}', "owner") ?? "null"),
  ).toMatchObject({ name: "keuken", userId: "owner", user_id: "owner" });
});
