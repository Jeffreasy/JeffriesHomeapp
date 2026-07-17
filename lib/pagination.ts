export type PageFetcher<T> = (limit: number, offset: number) => Promise<readonly T[]>;

export type FetchAllPagesOptions<T> = {
  pageSize?: number;
  maxPages?: number;
  getKey?: (item: T) => string;
};

/** Fetches an array endpoint fully, with deduplication and a hard loop guard. */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  options: FetchAllPagesOptions<T> = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 200;
  const maxPages = options.maxPages ?? 100;

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("pageSize must be a positive integer");
  }
  if (!Number.isInteger(maxPages) || maxPages <= 0) {
    throw new RangeError("maxPages must be a positive integer");
  }

  const items: T[] = [];
  const seen = options.getKey ? new Set<string>() : null;

  for (let page = 0; page < maxPages; page += 1) {
    const rows = await fetchPage(pageSize, page * pageSize);
    for (const row of rows) {
      if (seen && options.getKey) {
        const key = options.getKey(row);
        if (seen.has(key)) continue;
        seen.add(key);
      }
      items.push(row);
    }
    if (rows.length < pageSize) return items;
  }

  throw new Error(
    `Pagination stopped after ${maxPages} full pages; refusing to return a silently truncated collection.`,
  );
}
