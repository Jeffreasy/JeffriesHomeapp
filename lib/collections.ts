export function sortedCopy<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}

export function appendUniqueBy<T>(
  current: readonly T[],
  incoming: readonly T[],
  getKey: (item: T) => string,
): T[] {
  const seen = new Set(current.map(getKey));
  const appended = [...current];
  for (const item of incoming) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    appended.push(item);
  }
  return appended;
}
