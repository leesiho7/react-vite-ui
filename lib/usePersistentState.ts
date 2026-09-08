'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for Next.js Client Components that synchronizes React state with localStorage.
 * Prevents state loss and screen resets when the user refreshes (F5) or navigates pages.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from localStorage upon client-side mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        setState(JSON.parse(saved));
      }
    } catch (e) {
      console.warn(`[usePersistentState] Error loading key "${key}":`, e);
    } finally {
      setIsLoaded(true);
    }
  }, [key]);

  // 2. Save state to localStorage whenever updated
  const setPersistentState = (value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(nextValue));
      } catch (e) {
        console.warn(`[usePersistentState] Error saving key "${key}":`, e);
      }
      return nextValue;
    });
  };

  return [state, setPersistentState, isLoaded];
}
