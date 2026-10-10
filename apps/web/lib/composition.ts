import "server-only";

import { createBillingRepo } from "../db/billing";
import { createEventsRepo } from "../db/events";
import { createMemberRepo } from "../db/member";
import { createModerationRepo } from "../db/moderation";
import { createNotificationsRepo } from "../db/notifications";
import { createSavedRepo } from "../db/saved";
import { createOrganizationsRepo } from "../db/organizations";
import { createAdminDirectory } from "./auth/admin";
import { getServerEnv } from "./env/server";
import { createProofItemRepo } from "../db/proof-items";
import { clerkIdentityAdmin } from "./auth/clerk-identity-admin";
import { getDb } from "../db";
import { createDiscoverService, type DiscoverService } from "./services/discover";
import { createEventsService, type EventsService } from "./services/events";
import { searchPlaces } from "./places/gazetteer";
import { gazetteerGeocoder } from "./places/geocoder";
import { createMemberService, type MemberService } from "./services/member";
import { createAlertsService, type AlertsService } from "./services/alerts";
import { createBillingService, type BillingService } from "./services/billing";
import { unconfiguredPaymentProvider } from "./payments/unconfigured";
import { createModerationService, type ModerationService } from "./services/moderation";
import { createNotifier, type Notifier } from "./services/notifier";
import { createExpoPush, createLoggingPush } from "./notifications/push";
import { createOrganizationsService, type OrganizationsService } from "./services/organizations";
import { clerkEmailLookup } from "./auth/clerk-email-lookup";
import { createLoggingEmail } from "./messaging/email";
import { createSavedService, type SavedService } from "./services/saved";
import { createProofItemService, type ProofItemService } from "./services/proof-items";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Lazy, so `next build` needs no
// database environment and the first request fails fast if it is invalid.
let proofItems: ProofItemService | undefined;

export function getProofItemService(): ProofItemService {
  return (proofItems ??= createProofItemService({ repo: createProofItemRepo(getDb()) }));
}

let member: MemberService | undefined;

export function getMemberService(): MemberService {
  return (member ??= createMemberService({ repo: createMemberRepo(getDb()), identity: clerkIdentityAdmin }));
}

let organizations: OrganizationsService | undefined;

export function getOrganizationsService(): OrganizationsService {
  return (organizations ??= createOrganizationsService({
    repo: createOrganizationsRepo(getDb()),
    admins: createAdminDirectory(getServerEnv().adminUserIds),
    requireAccepted: (userId) => getMemberService().requireActiveMember(userId),
  }));
}

let events: EventsService | undefined;

export function getEventsService(): EventsService {
  const organizationsRepo = createOrganizationsRepo(getDb());
  return (events ??= createEventsService({
    repo: createEventsRepo(getDb()),
    isManager: (orgId, userId) => organizationsRepo.isApprovedManager(orgId, userId),
    admins: createAdminDirectory(getServerEnv().adminUserIds),
    requireAccepted: (userId) => getMemberService().requireActiveMember(userId),
    geocoder: gazetteerGeocoder,
    onEvent: (kind, eventId) => notifyEvent(kind, eventId),
  }));
}

let discover: DiscoverService | undefined;

export function getDiscoverService(): DiscoverService {
  // The database is opened only when a search or an event is actually read: finding a place uses
  // data shipped with the app and must work without it.
  let eventsRepo: ReturnType<typeof createEventsRepo> | undefined;
  const repo = () => (eventsRepo ??= createEventsRepo(getDb()));
  return (discover ??= createDiscoverService({
    repo: { searchPublic: (query) => repo().searchPublic(query), getPublic: (id) => repo().getPublic(id) },
    places: searchPlaces,
  }));
}

let saved: SavedService | undefined;

export function getSavedService(): SavedService {
  return (saved ??= createSavedService({
    repo: createSavedRepo(getDb()),
    events: createEventsRepo(getDb()),
    requireAccepted: (userId) => getMemberService().requireAccepted(userId),
  }));
}

/** The scheduler's secret from the server configuration, or null when none is set. */
export function getCronSecret(): string | null {
  return getServerEnv().cronSecret;
}

let moderation: ModerationService | undefined;
const processSalt = crypto.randomUUID() + crypto.randomUUID();

export function getModerationService(): ModerationService {
  return (moderation ??= createModerationService({
    repo: createModerationRepo(getDb()),
    admins: createAdminDirectory(getServerEnv().adminUserIds),
    email: createLoggingEmail(),
    emails: clerkEmailLookup,
    addressSalt: getServerEnv().rateLimitSalt ?? processSalt,
    onEventHidden: (eventId) => notifyEvent("changed", eventId),
  }));
}

let alerts: AlertsService | undefined;

export function getAlertsService(): AlertsService {
  return (alerts ??= createAlertsService({
    repo: createNotificationsRepo(getDb()),
    places: searchPlaces,
    requireAccepted: (userId) => getMemberService().requireAccepted(userId),
    unsubscribeSecret: getServerEnv().unsubscribeSecret,
  }));
}

let notifier: Notifier | undefined;

export function getNotifier(): Notifier {
  return (notifier ??= createNotifier({
    repo: createNotificationsRepo(getDb()),
    events: createEventsRepo(getDb()),
    push: getServerEnv().pushProvider === "expo" ? createExpoPush() : createLoggingPush(),
    onProblem: (name) => console.error(JSON.stringify({ event: "notifier.problem", name })),
  }));
}

/**
 * Tells the notifier about an event, and never lets that fail the request that caused it: a problem
 * sending notifications must not stop someone publishing an event.
 */
export async function notifyEvent(kind: "published" | "changed", eventId: string): Promise<void> {
  try {
    if (kind === "published") await getNotifier().enqueueNewEvent(eventId);
    else await getNotifier().enqueueEventChange(eventId);
  } catch (error) {
    console.error(JSON.stringify({ event: "notifier.enqueue_failed", kind, errorName: error instanceof Error ? error.name : typeof error }));
  }
}

let billing: BillingService | undefined;

// Plans, payment switches and entitlement (S10). No payment provider is configured yet (S11 adds Stripe), so
// the provider refuses to take a payment; admins are decided from the same ADMIN_USER_IDS list as elsewhere.
export function getBillingService(): BillingService {
  return (billing ??= createBillingService({
    repo: createBillingRepo(getDb()),
    admins: createAdminDirectory(getServerEnv().adminUserIds),
    provider: unconfiguredPaymentProvider,
  }));
}
