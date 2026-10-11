import { useAuth } from "@clerk/expo";
import { useEffect } from "react";

// Lets code outside React (the shared API clients) ask Clerk for the current session token. It renders nothing:
// inside the Clerk provider it keeps `currentToken` pointing at Clerk's own `getToken`, which hands out a fresh
// token on every call (so an expired one is never reused), and resets it to "no token" when it goes away.
type GetToken = () => Promise<string | null>;

let source: GetToken = async () => null;

/** The current session token, or null when nobody is signed in. */
export const currentToken: GetToken = () => source();

export function TokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    source = () => getToken();
    return () => {
      source = async () => null;
    };
  }, [getToken]);
  return null;
}
