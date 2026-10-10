import { Stack } from "expo-router";

import App from "../src/App";
import { appPalette } from "../src/theme";

// The root of the phone app: the app providers (configuration check and Clerk), then the screens.
export default function RootLayout() {
  return (
    <App>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: appPalette.background } }} />
    </App>
  );
}
