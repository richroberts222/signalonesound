import { Tabs } from "expo-router";

import { useTheme } from "../../src/theme";

// The four tabs (S5). Each tab button carries the test id from the controls inventory.
export default function TabsLayout() {
  const theme = useTheme();
  const tab = (title: string, testID: string) => ({ title, tabBarButtonTestID: testID, tabBarAccessibilityLabel: `${title} tab` });
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.foreground },
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 13 },
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="discover" options={tab("Discover", "tab-discover")} />
      <Tabs.Screen name="saved" options={tab("Saved", "tab-saved")} />
      <Tabs.Screen name="alerts" options={tab("Alerts", "tab-alerts")} />
      <Tabs.Screen name="account" options={tab("Account", "tab-account")} />
    </Tabs>
  );
}
