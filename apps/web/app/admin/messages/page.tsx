import type { Metadata } from "next";

import { MessagesConsole } from "@/components/admin/messages-console";

export const metadata: Metadata = { title: "Messages | Signal One Sound" };

// Protected by proxy.ts (everything under /admin) for sign-in; the API answers "not found" to anyone who
// is not a platform admin, so the page shows nothing to them.
export default function MessagesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Messages</h1>
      <MessagesConsole />
    </main>
  );
}
