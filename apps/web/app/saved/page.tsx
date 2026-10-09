import type { Metadata } from "next";

import { SavedList } from "@/components/events/saved-list";

export const metadata: Metadata = { title: "Saved events | Signal One Sound" };

// Protected by proxy.ts. The list is private to the person who made it.
export default function SavedPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-8">
      <div className="flex w-full max-w-3xl flex-col gap-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Saved events</h1>
        <p className="text-muted-foreground">Only you can see this list.</p>
      </div>
      <SavedList />
    </main>
  );
}
