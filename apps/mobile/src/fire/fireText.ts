// What the Fire button says, kept free of React Native so a test can check it (S19 on the phone).
export const FIRE_FAILED_TEXT = "We could not update your fire. Check your connection and try again.";
export const FIRE_LIMIT_TEXT = "You have reached today's limit for fires. Try again tomorrow.";

/** The words for a failed fire: the daily limit gets its own message, anything else the general one. */
export function fireFailureText(code: string): string {
  return code === "rate_limited" ? FIRE_LIMIT_TEXT : FIRE_FAILED_TEXT;
}

/** The button label for the current state; the state is also told to screen readers by the button itself. */
export function fireLabel(fired: boolean | null): string {
  return fired ? "Fired (tap to take back)" : "Fire this";
}
