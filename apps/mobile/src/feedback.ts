// How a control looks while it is pressed or switched off (S5). Plain data with no React Native import, so a
// test can check it. A person must see that a tap registered: a pressed control dims clearly, and a disabled
// one looks different from a pressed one.
export const PRESSED_OPACITY = 0.6;
export const DISABLED_OPACITY = 0.5;

export function feedbackOpacity({ pressed, disabled }: { pressed: boolean; disabled?: boolean }): number {
  if (disabled) return DISABLED_OPACITY;
  return pressed ? PRESSED_OPACITY : 1;
}
