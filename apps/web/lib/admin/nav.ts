import type { NavItem } from "../navigation/nav-config";

// Section navigation inside the admin mock only. Global navigation stays in
// lib/navigation/nav-config.ts; this list is not global navigation.
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { label: "Overview", href: "/admin", exact: true },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Events", href: "/admin/events" },
  { label: "Submissions", href: "/admin/submissions" },
  { label: "Import", href: "/admin/import" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Messages", href: "/admin/messages" },
];
