// Ports for observability (docs/code-quality.md section 12, docs/ideas/observability.md). Both
// have a do-nothing default adapter so the application runs, and is tested, without any vendor.
// A real vendor is chosen later with the owner's approval and plugs in here without touching callers.

/**
 * Private analytics (owner decision 2026-10-09): totals only, with no user identifier, no network
 * address, no cookie and no third-party script. An event carries a name and nothing else.
 */
export type AnalyticsEvent = "page_view" | "search" | "event_view";
export type AnalyticsPort = { count(event: AnalyticsEvent): void };
export const noopAnalytics: AnalyticsPort = { count() {} };

/**
 * Error tracking. The port only ever receives text that has already been redacted (see redact.ts),
 * and never a user identity or request data.
 */
export type ErrorReport = { name: string; message?: string };
export type ErrorTrackerPort = { capture(report: ErrorReport): void };
export const noopErrorTracker: ErrorTrackerPort = { capture() {} };
