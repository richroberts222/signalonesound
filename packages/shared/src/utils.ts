// Pure, runtime-agnostic helpers. No Node-only, browser-only, or server-only APIs.

export function assertNever(value: never): never {
  throw new Error("Unexpected value: " + String(value));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
