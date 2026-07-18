import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Debounce a value: only update the returned value after `delay` ms of no changes.
 * Used to prevent API spam on slider/color picker drag.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A debounced callback that also exposes `flush` and `cancel`.
 * - Calling it schedules `callback` after `delay` ms of no calls.
 * - `flush()` runs any pending call immediately (used on unmount so parked
 *   taps aren't lost — HabitCard stepper).
 * - `cancel()` drops any pending call without running it (used when the shown
 *   date changes so a parked commit never writes to the new date).
 */
export interface DebouncedCallback<Args extends unknown[]> {
  (...args: Args): void;
  flush: () => void;
  cancel: () => void;
}

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  options?: {
    /**
     * Defaults to true for persisted steppers. Live device controls opt out so
     * closing a panel can never flush an obsolete physical command.
     */
    flushOnUnmount?: boolean;
  },
): DebouncedCallback<Args> {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cbRef = useRef(callback);
  // Remember the last scheduled args so flush() can replay them.
  const pendingArgsRef = useRef<Args | null>(null);
  const flushOnUnmount = options?.flushOnUnmount ?? true;

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current === undefined) return;
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    const args = pendingArgsRef.current;
    pendingArgsRef.current = null;
    if (args) cbRef.current(...args);
  }, []);

  // Persisted steppers flush; ephemeral physical controls explicitly cancel.
  useEffect(() => {
    return () => {
      if (flushOnUnmount) flush();
      else cancel();
    };
  }, [cancel, flush, flushOnUnmount]);

  // Build the composite (callable + flush/cancel) inside useMemo so the methods
  // are assigned to a freshly-created local function, not onto a frozen memoized
  // value (which the React-compiler lint forbids mutating).
  return useMemo(() => {
    const fn = ((...args: Args) => {
      clearTimeout(timerRef.current);
      pendingArgsRef.current = args;
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        pendingArgsRef.current = null;
        cbRef.current(...args);
      }, delay);
    }) as DebouncedCallback<Args>;
    fn.flush = flush;
    fn.cancel = cancel;
    return fn;
  }, [delay, flush, cancel]);
}

