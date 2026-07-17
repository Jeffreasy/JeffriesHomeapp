import { expect, test } from "@playwright/test";
import { appendUniqueBy, sortedCopy } from "../../lib/collections";

test("sortedCopy never mutates cached input arrays", () => {
  const input = [{ id: "b" }, { id: "a" }];
  expect(sortedCopy(input, (a, b) => a.id.localeCompare(b.id))).toEqual([{ id: "a" }, { id: "b" }]);
  expect(input).toEqual([{ id: "b" }, { id: "a" }]);
});

test("appendUniqueBy prevents duplicate pagination rows", () => {
  expect(
    appendUniqueBy([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }], (row) => row.id),
  ).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
});
