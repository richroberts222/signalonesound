import type { EventSource, EventStatus, OrgStatus } from "./types";

export const SOURCE_LABEL: Record<EventSource, string> = {
  church: "Church/Ministry-managed",
  community: "Community submission",
  admin: "Admin entry",
  import: "Bulk import",
};

export const ORG_STATUS_LABEL: Record<OrgStatus, string> = {
  active: "Active",
  unverified: "Unverified",
  paused: "Paused",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  published: "Published",
  "pending-review": "Pending review",
  hidden: "Hidden",
};
