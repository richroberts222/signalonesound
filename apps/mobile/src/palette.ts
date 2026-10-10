// Color tokens for the phone app, named like the web's semantic tokens (docs/ui.md section 22) so a color
// means the same thing on both. Plain data with no React Native import, so a test can check contrast.
export const light = {
  background: "#ffffff",
  foreground: "#171717",
  card: "#f5f5f4",
  muted: "#57534e",
  border: "#78716c",
  primary: "#b45309",
  primaryForeground: "#ffffff",
  destructive: "#b91c1c",
};

export const dark = {
  background: "#0c0a09",
  foreground: "#fafaf9",
  card: "#1c1917",
  muted: "#a8a29e",
  border: "#78716c",
  primary: "#fbbf24",
  primaryForeground: "#1c1917",
  destructive: "#f87171",
};

export type Palette = typeof light;
