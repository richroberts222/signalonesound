import "server-only";

import { createEventsRepo } from "../db/events";
import { createMemberRepo } from "../db/member";
import { createOrganizationsRepo } from "../db/organizations";
import { createAdminDirectory } from "./auth/admin";
import { getServerEnv } from "./env/server";
import { createProofItemRepo } from "../db/proof-items";
import { clerkIdentityAdmin } from "./auth/clerk-identity-admin";
import { getDb } from "../db";
import { createEventsService, type EventsService } from "./services/events";
import { createMemberService, type MemberService } from "./services/member";
import { createOrganizationsService, type OrganizationsService } from "./services/organizations";
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
    requireAccepted: (userId) => getMemberService().requireAccepted(userId),
  }));
}

let events: EventsService | undefined;

export function getEventsService(): EventsService {
  const organizationsRepo = createOrganizationsRepo(getDb());
  return (events ??= createEventsService({
    repo: createEventsRepo(getDb()),
    isManager: (orgId, userId) => organizationsRepo.isApprovedManager(orgId, userId),
    admins: createAdminDirectory(getServerEnv().adminUserIds),
    requireAccepted: (userId) => getMemberService().requireAccepted(userId),
  }));
}
