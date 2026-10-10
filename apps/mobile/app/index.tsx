import { Redirect } from "expo-router";

// The app opens on Discover.
export default function Index() {
  return <Redirect href="/discover" />;
}
