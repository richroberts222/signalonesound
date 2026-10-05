"use client";

import type { ReactNode } from "react";
import { Loader2, LocateFixed } from "lucide-react";
import { FilterChip } from "@/components/discover/filter-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DATE_PRESETS,
  RADIUS_OPTIONS,
  type DiscoverFilters,
} from "@/lib/discover/filters";
import { MOCK_ORIGINS, MOCK_TODAY } from "@/lib/discover/mock-data";
import { REVIVAL_TYPES, type RevivalTypeId } from "@/lib/discover/revival-types";

type DiscoverFiltersProps = {
  filters: DiscoverFilters;
  locating: boolean;
  onNearMe: () => void;
  onChange: (patch: Partial<DiscoverFilters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

function Group({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        {legend}
        {hint ? <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </legend>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </fieldset>
  );
}

export function DiscoverFilterPanel({
  filters,
  locating,
  onNearMe,
  onChange,
  onClear,
  hasActiveFilters,
}: DiscoverFiltersProps) {
  const toggleType = (id: RevivalTypeId) =>
    onChange({
      types: filters.types.includes(id)
        ? filters.types.filter((t) => t !== id)
        : [...filters.types, id],
    });
  const specificDate = DATE_PRESETS.some((p) => p.id === filters.date) ? "" : filters.date;

  return (
    <form
      className="flex flex-col gap-5 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs sm:p-5"
      aria-label="Filter revival events"
      onSubmit={(e) => e.preventDefault()}
    >
      <Group legend="Location" hint={filters.near ? undefined : "Start here"}>
        <Button type="button" size="lg" onClick={onNearMe} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          {locating ? "Finding you…" : filters.near ? "Update Near Me" : "Near Me"}
        </Button>
        {filters.near ? (
          <span className="text-sm text-muted-foreground">Mock location (no real GPS used):</span>
        ) : null}
        {filters.near
          ? MOCK_ORIGINS.map((o) => (
              <FilterChip key={o.id} active={filters.near === o.id} onClick={() => onChange({ near: o.id })}>
                {o.label}
              </FilterChip>
            ))
          : null}
      </Group>

      <Group legend="Distance">
        {RADIUS_OPTIONS.map((r) => (
          <FilterChip key={r} active={filters.radius === r} onClick={() => onChange({ radius: r })}>
            {r === "any" ? "Unlimited" : `${r} miles`}
          </FilterChip>
        ))}
        <FilterChip active={false} disabled onClick={() => {}} title="The product plan lists an unspecified radius “X”; undecided.">
          X
        </FilterChip>
      </Group>

      <Group legend="Date">
        {DATE_PRESETS.map((p) => (
          <FilterChip key={p.id} active={filters.date === p.id} onClick={() => onChange({ date: p.id })}>
            {p.label}
          </FilterChip>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">or pick a day</span>
          <Input
            type="date"
            min={MOCK_TODAY}
            value={specificDate}
            onChange={(e) => onChange({ date: e.target.value || "any" })}
            className="h-8 w-auto"
          />
        </label>
      </Group>

      <Group legend="Revival Type" hint="Pick any that apply">
        {REVIVAL_TYPES.map((t) => (
          <FilterChip key={t.id} active={filters.types.includes(t.id)} onClick={() => toggleType(t.id)}>
            {t.label}
          </FilterChip>
        ))}
      </Group>

      {hasActiveFilters ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear date &amp; type filters
          </Button>
        </div>
      ) : null}
    </form>
  );
}
