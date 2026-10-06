// Single definition of global navigation destinations. Shell components render
// from this list; feature pages never define global navigation themselves.
// Replacing the header with another pattern (sidebar, bottom tabs) means writing
// a new renderer for this list, not editing pages.
//
// Deliberately NOT listed (decision documented in docs/notes.md, Issue 68):
// - Saved: no destination exists. Save is a browser-local mock; saved events on
//   an account are Later Phase 1 in the product plan. No fake page is built.
// - Church/ministry/admin navigation: separate future shell.

export type NavItem = {
  label: string;
  href: string;
  /** Exact match only (Home), otherwise the item is active for nested routes too. */
  exact?: boolean;
  /** Shown only to signed-in users. */
  signedInOnly?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/", exact: true },
  { label: "Discover", href: "/discover" },
  { label: "Dashboard", href: "/dashboard", signedInOnly: true },
  { label: "Account", href: "/account", signedInOnly: true },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
