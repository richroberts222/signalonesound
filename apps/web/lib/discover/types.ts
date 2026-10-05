import type { RevivalTypeId } from "./revival-types";

// MOCK-STAGE shapes for the Discover Revival mock (Issue #66). These describe
// what the mock UI needs; they are NOT a database schema or API contract. The
// Data Requirements Review / Database Design Checkpoint decides the real model
// (/docs/product-development.md section 5).

export type MockVenue = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
};

export type MockOrganizationLink = { label: string; url: string };

/** "Church/Ministry" (naming-conventions.md). */
export type MockOrganization = {
  name: string;
  /** Source: 1 minimum, up to 3. */
  links: MockOrganizationLink[];
};

export type MockSpeaker = { name: string; role?: string };

/** "Event" (naming-conventions.md). Dates are local calendar dates, no time zone. */
export type MockEvent = {
  id: string;
  title: string;
  summary: string;
  description: string;
  revivalTypes: RevivalTypeId[];
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD; present for multi-day events. */
  endDate?: string;
  /** HH:mm, 24-hour */
  startTime: string;
  endTime?: string;
  venue: MockVenue;
  organization: MockOrganization;
  /** Speaker(s) are Later Phase 1 in the plan (B1); shown to evaluate the presentation. */
  speakers?: MockSpeaker[];
};

/** A mock stand-in for "Near Me" (no real geolocation is requested). */
export type MockOrigin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};
