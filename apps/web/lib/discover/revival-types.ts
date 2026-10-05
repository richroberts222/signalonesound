// Revival Type list exactly as given in the product plan, section A1
// (/docs/product/product-plan.md). Whether the list is fixed or extensible is
// undecided (/docs/naming-conventions.md), so this is a mock-stage constant,
// not a schema or contract.
export const REVIVAL_TYPES = [
  { id: "tent-revival", label: "Tent revivals" },
  { id: "church-revival", label: "Church revivals" },
  { id: "baptism", label: "Baptisms" },
  { id: "worship-night", label: "Worship nights" },
  { id: "prayer-gathering", label: "Prayer gatherings" },
  { id: "healing-deliverance", label: "Healing & Deliverance" },
  { id: "conference", label: "Conferences" },
  { id: "youth", label: "Youth events" },
  { id: "women", label: "Women's events" },
  { id: "men", label: "Men's events" },
  { id: "family", label: "Family events" },
  { id: "other", label: "Other" },
] as const;

export type RevivalTypeId = (typeof REVIVAL_TYPES)[number]["id"];

const LABELS = new Map<string, string>(REVIVAL_TYPES.map((t) => [t.id, t.label]));

export function isRevivalTypeId(value: string): value is RevivalTypeId {
  return LABELS.has(value);
}

export function revivalTypeLabel(id: RevivalTypeId): string {
  return LABELS.get(id) ?? id;
}
