/**
 * Characters left before the note limit, counted in Unicode code points so it matches the server
 * (a four-byte emoji counts as one). Never negative.
 */
export function remainingCharacters(value: string, max: number): number {
  return Math.max(0, max - [...value.trim()].length);
}
