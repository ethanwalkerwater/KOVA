"use client";

import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` ms
 * of inactivity. Useful for delaying API calls while a user types.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
