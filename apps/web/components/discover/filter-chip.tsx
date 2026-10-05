"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
};

/** Toggleable filter option; the shared look for radius, date, and Revival Type choices. */
export function FilterChip({ active, onClick, children, disabled, title }: FilterChipProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="rounded-full"
    >
      {children}
    </Button>
  );
}
