"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedEvents } from "@/lib/discover/use-saved-events";
import { cn } from "@/lib/utils";

type SaveButtonProps = {
  eventId: string;
  eventTitle: string;
  /** Text label next to the icon (Event Details); icon-only on cards. */
  showLabel?: boolean;
  onToggled?: (saved: boolean) => void;
  className?: string;
};

export function SaveButton({ eventId, eventTitle, showLabel, onToggled, className }: SaveButtonProps) {
  const { isSaved, toggle } = useSavedEvents();
  const saved = isSaved(eventId);

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={showLabel ? "lg" : "icon"}
      aria-pressed={saved}
      aria-label={`${saved ? "Unsave" : "Save"} ${eventTitle}`}
      className={cn(saved && "text-primary", className)}
      onClick={() => onToggled?.(toggle(eventId))}
    >
      <Heart className={cn(saved && "fill-current")} />
      {showLabel ? (saved ? "Saved" : "Save") : null}
    </Button>
  );
}
