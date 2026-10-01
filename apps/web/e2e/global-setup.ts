import { clerkSetup } from "@clerk/testing/playwright";

// Obtains a Clerk testing token (bot-protection bypass for Clerk DEVELOPMENT
// instances). `E2E_READY` is set by playwright.config.ts only after its
// fail-closed dev/qa checks passed; otherwise the specs skip with a reason
// instead of passing silently.
export default async function globalSetup() {
  if (process.env.E2E_READY !== "1") return;
  await clerkSetup();
}
