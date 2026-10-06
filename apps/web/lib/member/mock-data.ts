import type { NotificationPrefs } from "./preferences";

// MOCK DATA ONLY (Issue #74). Starting preferences and the invite link are
// fictional and static. Nothing is read from or written to a database, and
// changes made in the UI reset on reload.

export const NOTIFICATION_TITLE = "Revival coming near you!";

export const INITIAL_PREFS: NotificationPrefs = {
  enabled: true,
  locations: [{ id: "loc-nashville-tn", label: "Nashville, TN", radius: 25 }],
  timeframes: ["next-30-days"],
};

/** Reserved example domain; not a real invite or referral link. */
export const MOCK_INVITE_LINK = "https://example.org/join/mock-invite";

export const MOCK_INVITE_MESSAGE =
  "Join me on Signal One Sound to find revival gatherings near you.";

export const MOCK_PUSH_PREVIEW = {
  title: NOTIFICATION_TITLE,
  body: "Fall Harvest Revival, Oct 22 in Nashville, TN (fictional example).",
};
