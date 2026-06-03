import { useCallback, useEffect, useRef, useState } from "react";

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
 * Debounced callback: fires the callback only after `delay` ms of no calls.
 * Used to prevent API spam while dragging sliders.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return useCallback((...args: Args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => cbRef.current(...args), delay);
  }, [delay]);
}

