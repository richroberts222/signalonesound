import { z } from "zod";

// S0 WALKING SKELETON (docs/features/s0-walking-skeleton.md). A deliberately
// small, throwaway "hello note" that proves sign-in -> API -> service -> data
// access -> database on web and mobile with one shared contract. It is replaced
// by real profile data in S1 and removed then.
//
// These are public wire contracts: independent of database row types.

export const HELLO_PATH = "/api/v1/me/hello";
export const HELLO_NOTE_MAX = 140;

const codePoints = (value: string): number => [...value].length;

// Single line: no newline, tab, or other control character (including DEL).
const hasControlCharacter = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

/** Request body for PUT. Unknown fields are rejected. The note may be empty (clears it). */
export const putHelloSchema = z
  .object({
    note: z
      .string()
      .trim()
      .refine((v) => codePoints(v) <= HELLO_NOTE_MAX, `Note must be at most ${HELLO_NOTE_MAX} characters`)
      .refine((v) => !hasControlCharacter(v), "Note must be a single line of plain text"),
  })
  .strict();
export type PutHelloInput = z.infer<typeof putHelloSchema>;

/** What clients see. `note` is null when nothing is saved. */
export const helloSchema = z.object({ note: z.string().nullable() });
export type Hello = z.infer<typeof helloSchema>;
