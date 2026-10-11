"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

// Switches between the World and United States maps (S16). Both are drawn by the server and passed in, so this
// holds only which one is showing.
export function FireMapTabs({ world, us }: { world: ReactNode; us: ReactNode }) {
  const [view, setView] = useState<"world" | "us">("world");
  const tab = (id: "world" | "us", label: string, testId: string) => (
    <Button
      type="button"
      role="tab"
      variant={view === id ? "secondary" : "outline"}
      aria-selected={view === id}
      data-testid={testId}
      onClick={() => setView(id)}
      className="rounded-full px-4"
    >
      {label}
    </Button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Choose a map" className="flex gap-2">
        {tab("world", "World", "fire-map-tab-world")}
        {tab("us", "United States", "fire-map-tab-us")}
      </div>
      <div role="tabpanel" hidden={view !== "world"}>
        {world}
      </div>
      <div role="tabpanel" hidden={view !== "us"}>
        {us}
      </div>
    </div>
  );
}
