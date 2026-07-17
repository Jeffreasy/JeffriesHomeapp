import { expect, test } from "@playwright/test";
import { fetchAllPages } from "../../lib/pagination";

test("fetchAllPages drains every page with the expected offsets", async () => {
  const source = Array.from({ length: 451 }, (_, id) => ({ id: String(id) }));
  const offsets: number[] = [];

  const result = await fetchAllPages(
    async (limit, offset) => {
      offsets.push(offset);
      return source.slice(offset, offset + limit);
    },
    { pageSize: 200, getKey: (row) => row.id },
  );

  expect(result).toEqual(source);
  expect(offsets).toEqual([0, 200, 400]);
});

test("fetchAllPages deduplicates moving offset windows", async () => {
  const pages = [
    [{ id: "a" }, { id: "b" }],
    [{ id: "b" }, { id: "c" }],
    [] as { id: string }[],
  ];

  const result = await fetchAllPages(
    async (_limit, offset) => pages[offset / 2],
    { pageSize: 2, getKey: (row) => row.id },
  );

  expect(result.map((row) => row.id)).toEqual(["a", "b", "c"]);
});

test("fetchAllPages fails loudly instead of silently truncating", async () => {
  await expect(
    fetchAllPages(async () => [{ id: "always-full" }], { pageSize: 1, maxPages: 2 }),
  ).rejects.toThrow(/silently truncated/);
});
