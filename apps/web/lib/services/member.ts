import {
  CURRENT_POLICY_VERSION,
  POLICY_KINDS,
  type AcceptPolicyInput,
  type DataExport,
  type PatchProfileInput,
  type Profile,
} from "@signalone/validation";

import type { AcceptanceRow, MemberRepo, ProfileRow } from "../../db/member";
import type { ServiceContext } from "./context";
import { policyReacceptanceRequired, validationFailed } from "./errors";

// Service for the member's own identity data (S1, docs/features/s1-identity-and-policy.md). The
// user id always comes from the authenticated context, never from a request, so a member can only
// ever read or change their own data. Business rules live here: the current policy must be
// accepted (with the 18+ attestation) before member features work, and deletion is idempotent.
// Framework-free; the repo and the Clerk admin port are injected.

/** The one thing the service needs from Clerk's backend: removing the identity itself. */
export type IdentityAdmin = {
  /** Deletes the Clerk user. Must succeed quietly if the user is already gone. */
  deleteUser(clerkUserId: string): Promise<void>;
};

export type MemberServiceDeps = {
  repo: MemberRepo;
  identity: IdentityAdmin;
  now?: () => Date;
};

const acceptedVersion = (rows: AcceptanceRow[]): string | null => {
  // Accepted only if the latest record of EVERY policy kind is the current version.
  const latest = new Map<string, string>();
  for (const row of rows) latest.set(row.policyKind, row.version);
  const versions = POLICY_KINDS.map((kind) => latest.get(kind));
  if (versions.some((v) => v === undefined)) return null;
  return versions.every((v) => v === CURRENT_POLICY_VERSION) ? CURRENT_POLICY_VERSION : (versions[0] ?? null);
};

const toProfile = (row: ProfileRow, rows: AcceptanceRow[]): Profile => {
  const accepted = acceptedVersion(rows);
  return {
    displayName: row.displayName,
    emailPref: row.emailPref,
    timeZone: row.timeZone,
    policy: {
      currentVersion: CURRENT_POLICY_VERSION,
      acceptedVersion: accepted,
      accepted: accepted === CURRENT_POLICY_VERSION,
    },
  };
};

export function createMemberService({ repo, identity, now = () => new Date() }: MemberServiceDeps) {
  async function requireAccepted(userId: string): Promise<void> {
    const accepted = acceptedVersion(await repo.listAcceptances(userId));
    if (accepted !== CURRENT_POLICY_VERSION) throw policyReacceptanceRequired();
  }

  return {
    /** Throws `policy_reacceptance_required` unless the member accepted the current policy. */
    requireAccepted,

    /** The caller's profile, created on first sign-in. Allowed before accepting the policy. */
    async getProfile(ctx: ServiceContext): Promise<Profile> {
      const row = await repo.ensureProfile(ctx.actor.userId);
      return toProfile(row, await repo.listAcceptances(ctx.actor.userId));
    },

    /** Changes only the fields a member may change. Requires the current policy to be accepted. */
    async updateProfile(ctx: ServiceContext, input: PatchProfileInput): Promise<Profile> {
      await requireAccepted(ctx.actor.userId);
      await repo.ensureProfile(ctx.actor.userId);
      const row = await repo.updateProfile(ctx.actor.userId, input);
      if (!row) throw validationFailed("Profile not found");
      return toProfile(row, await repo.listAcceptances(ctx.actor.userId));
    },

    /** Records acceptance of the current Terms and Privacy Policy and the 18+ attestation. */
    async acceptPolicy(ctx: ServiceContext, input: AcceptPolicyInput): Promise<Profile> {
      if (input.version !== CURRENT_POLICY_VERSION) {
        throw validationFailed("That policy version is not current", { version: ["Not the current version"] });
      }
      const userId = ctx.actor.userId;
      const row = await repo.ensureProfile(userId);
      await repo.recordAcceptances(
        userId,
        POLICY_KINDS.map((policyKind) => ({ policyKind, version: input.version })),
      );
      return toProfile(row, await repo.listAcceptances(userId));
    },

    /** Everything held about the caller, and nothing about anyone else. */
    async exportData(ctx: ServiceContext): Promise<DataExport> {
      const data = await repo.exportAll(ctx.actor.userId);
      return { exportedAt: now().toISOString(), data };
    },

    /**
     * Removes the caller's data, then the Clerk identity. Safe to repeat: if the Clerk step failed
     * the first time, a second call finishes it; if everything is gone it succeeds quietly.
     */
    async deleteAccount(ctx: ServiceContext): Promise<{ deleted: true }> {
      await repo.eraseAll(ctx.actor.userId);
      await identity.deleteUser(ctx.actor.userId);
      return { deleted: true };
    },

    /** The Clerk "user deleted" webhook: the same erase path, without calling Clerk again. */
    async handleUserDeleted(clerkUserId: string): Promise<void> {
      await repo.eraseAll(clerkUserId);
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
