import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, organizationMember, policyAcceptance, proofItem, userProfile } from "./schema";

// Data access for the member's own data (S1, docs/features/s1-identity-and-policy.md). Server-only
// by convention (like all of db/). It owns the Drizzle queries and DatabaseError wrapping and
// returns its own row types that the service maps to the public contracts.
export type ProfileRow = typeof userProfile.$inferSelect;
export type AcceptanceRow = typeof policyAcceptance.$inferSelect;

/**
 * Every table that holds a member's data, with how it is exported and erased. The export and the
 * deletion are built from this one list; a guard test fails if the schema gains a member-owned
 * table that is not listed here (docs/data-inventory.md, "Deletion path").
 */
export const MEMBER_TABLES = ["user_profile", "policy_acceptance", "proof_item", "organization_member", "audit_log"] as const;

export type ProfilePatch = { displayName?: string; emailPref?: boolean; timeZone?: string };

export type MemberRepo = ReturnType<typeof createMemberRepo>;

export function createMemberRepo(db: Database) {
  return {
    findProfile: (clerkUserId: string): Promise<ProfileRow | null> =>
      withDbErrors("member.findProfile", async () => {
        const [row] = await db.select().from(userProfile).where(eq(userProfile.clerkUserId, clerkUserId)).limit(1);
        return row ?? null;
      }),

    /** Creates the profile on first sign-in; a concurrent create is harmless. */
    ensureProfile: (clerkUserId: string): Promise<ProfileRow> =>
      withDbErrors("member.ensureProfile", async () => {
        await db.insert(userProfile).values({ clerkUserId }).onConflictDoNothing({ target: userProfile.clerkUserId });
        const [row] = await db.select().from(userProfile).where(eq(userProfile.clerkUserId, clerkUserId)).limit(1);
        if (!row) throw new Error("profile missing after ensure");
        return row;
      }),

    updateProfile: (clerkUserId: string, patch: ProfilePatch): Promise<ProfileRow | null> =>
      withDbErrors("member.updateProfile", async () => {
        if (Object.keys(patch).length === 0) {
          const [row] = await db.select().from(userProfile).where(eq(userProfile.clerkUserId, clerkUserId)).limit(1);
          return row ?? null;
        }
        const [row] = await db.update(userProfile).set(patch).where(eq(userProfile.clerkUserId, clerkUserId)).returning();
        return row ?? null;
      }),

    listAcceptances: (userId: string): Promise<AcceptanceRow[]> =>
      withDbErrors("member.listAcceptances", () =>
        db.select().from(policyAcceptance).where(eq(policyAcceptance.userId, userId)).orderBy(asc(policyAcceptance.acceptedAt)),
      ),

    recordAcceptances: (userId: string, entries: { policyKind: string; version: string }[]): Promise<void> =>
      withDbErrors("member.recordAcceptances", async () => {
        if (entries.length === 0) return;
        await db.insert(policyAcceptance).values(entries.map((e) => ({ userId, ...e })));
      }),

    /** Every row held about the member, keyed by table name (see MEMBER_TABLES). */
    exportAll: (userId: string): Promise<Record<string, Record<string, unknown>[]>> =>
      withDbErrors("member.exportAll", async () => {
        const [profiles, acceptances, items, memberships, audit] = await Promise.all([
          db.select().from(userProfile).where(eq(userProfile.clerkUserId, userId)),
          db.select().from(policyAcceptance).where(eq(policyAcceptance.userId, userId)),
          db.select().from(proofItem).where(eq(proofItem.ownerId, userId)),
          db.select().from(organizationMember).where(eq(organizationMember.userId, userId)),
          db.select().from(auditLog).where(eq(auditLog.actorId, userId)),
        ]);
        return {
          user_profile: profiles,
          policy_acceptance: acceptances,
          proof_item: items,
          organization_member: memberships,
          audit_log: audit,
        };
      }),

    /**
     * Removes the member's data in one atomic batch: the profile and owned rows are deleted; the
     * policy acceptance records are kept for the legal period but unlinked from the person.
     */
    eraseAll: (userId: string): Promise<void> =>
      withDbErrors("member.eraseAll", async () => {
        await db.batch([
          // An organization whose only approved manager is leaving goes back to "pending" (S2 AC13): it
          // keeps its events and shows up as unmanaged in the admin queue. Must run before the delete.
          db.execute(sql`update organization set status = 'pending'
            where status = 'approved'
              and id in (select org_id from organization_member where user_id = ${userId} and status = 'approved')
              and not exists (select 1 from organization_member m where m.org_id = organization.id and m.status = 'approved' and m.user_id <> ${userId})`),
          db.delete(organizationMember).where(eq(organizationMember.userId, userId)),
          // The audit log is append-only and kept; the person is unlinked from it.
          db.execute(sql`update audit_log set actor_id = 'deleted:' || gen_random_uuid()::text,
            subject = replace(subject, ${userId}, 'deleted') where actor_id = ${userId} or subject like ${"%" + userId + "%"}`),
          db.delete(proofItem).where(eq(proofItem.ownerId, userId)),
          db
            .update(policyAcceptance)
            .set({ userId: sql`'deleted:' || gen_random_uuid()::text` })
            .where(eq(policyAcceptance.userId, userId)),
          db.delete(userProfile).where(eq(userProfile.clerkUserId, userId)),
        ]);
      }),
  };
}
