import { useColorScheme } from "react-native";

import { dark, light, type Palette } from "./palette";

/** The colors for the phone's current light or dark setting. */
export const useTheme = (): Palette => (useColorScheme() === "dark" ? dark : light);
