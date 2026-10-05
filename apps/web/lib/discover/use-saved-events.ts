"use client";

import { useCallback, useSyncExternalStore } from "react";

// MOCK "Save": remembered only in this browser's localStorage so the interaction
// can be evaluated. It is not an account feature and nothing is sent anywhere.
// (Saving favorites to a profile is Later Phase 1 in the product plan.)
const KEY = "signalonesound.mock.saved-events";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function useSavedEvents() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");

  const isSaved = useCallback((id: string) => parse(raw).includes(id), [raw]);

  const toggle = useCallback((id: string) => {
    const current = parse(read());
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode): the mock simply does not remember.
    }
    listeners.forEach((l) => l());
    return next.includes(id);
  }, []);

  return { isSaved, toggle, count: parse(raw).length };
}
