import { dark, type Palette } from "./palette";

// The web app has ONE theme, dark (its `:root` and `.dark` tokens are the same), so the phone uses the same
// dark palette whatever the phone's light or dark setting is: the two look like the same product. The light
// palette stays in palette.ts (contrast-tested) in case a light theme is ever decided for both.
export const appPalette: Palette = dark;

/** The colors for the phone app. */
export const useTheme = (): Palette => appPalette;
