import { useEffect, useRef, useState } from "react";

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
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  return ((...args: Parameters<T>) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => cbRef.current(...args), delay);
  }) as T;
}
