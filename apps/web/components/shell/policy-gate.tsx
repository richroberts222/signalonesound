"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createApiClient, createProfileClient } from "@signalone/validation";

// Pages a signed-in member may use without having accepted the current policy: the policies
// themselves, the acceptance step, and sign-out related routes. Everything else sends the member to
// the acceptance step. The API enforces the same rule (403 policy_reacceptance_required), so this
// redirect is only the friendly side of it.
const OPEN_PATHS = ["/accept-terms", "/terms", "/privacy", "/about", "/contact", "/sign-in", "/sign-up"];

export function PolicyGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const client = useMemo(() => createProfileClient(createApiClient({ baseUrl: "" })), []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return;
    let active = true;
    void client.get().then((result) => {
      if (active && result.ok && !result.data.policy.accepted) router.replace("/accept-terms");
    });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, pathname, client, router]);

  return null;
}
