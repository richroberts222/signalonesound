import type { Metadata } from "next";

import { AlertsManager } from "@/components/events/alerts-manager";

export const metadata: Metadata = { title: "My alerts | Signal One Sound" };

// Protected by proxy.ts. Alerts are private to the person who made them.
export default function AlertsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-8">
      <div className="flex w-full max-w-2xl flex-col gap-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">My alerts</h1>
        <p className="text-muted-foreground">Be told when a revival is coming near you. Only you can see this.</p>
      </div>
      <AlertsManager />
    </main>
  );
}
