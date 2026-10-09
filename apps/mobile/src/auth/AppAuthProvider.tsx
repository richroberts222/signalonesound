import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import type { ReactNode } from "react";

// Clerk for the phone apps (docs/auth.md, docs/mobile.md). The publishable key is public by design
// and arrives through EXPO_PUBLIC_*; the session token is kept in the device's secure storage by
// Clerk's token cache. No Clerk secret key ever exists in the app.
export function AppAuthProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
