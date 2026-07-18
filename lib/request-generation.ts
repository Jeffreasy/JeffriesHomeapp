export type RequestGenerationGate = {
  begin: () => number;
  current: () => number;
  invalidate: () => number;
  isCurrent: (generation: number) => boolean;
};

/**
 * Monotonic request gate. A response may update state only while the captured
 * generation is current; starting a new filter/refresh invalidates older work.
 */
export function createRequestGenerationGate(): RequestGenerationGate {
  let generation = 0;

  return {
    begin() {
      generation += 1;
      return generation;
    },
    current() {
      return generation;
    },
    invalidate() {
      generation += 1;
      return generation;
    },
    isCurrent(candidate) {
      return candidate === generation;
    },
  };
}