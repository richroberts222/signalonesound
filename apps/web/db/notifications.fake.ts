import { randomUUID } from "node:crypto";

import type { NewQueueItem, NotificationsRepo, QueueRow, ReminderTarget, RuleRow } from "./notifications";

// Test-only in-memory stand-in for the notifications repo. It mimics what the services rely on: rules
// and tokens are scoped to their owner, a token belongs to one person at a time, the queue skips a
// second row with the same person and key, and the caps and ceiling are counted from sent rows. The
// `world` tells it who saved which event and which reminders are due (the real repo joins tables).
// Never used in application code.
export type NotificationWorld = {
  savers: (eventId: string) => { userId: string; timeZone: string | null }[];
  reminders: (from: Date, to: Date) => ReminderTarget[];
  timeZones: Map<string, string>;
  reminderOff: Set<string>;
};
export const emptyNotificationWorld = (): NotificationWorld => ({ savers: () => [], reminders: () => [], timeZones: new Map(), reminderOff: new Set() });

export type FakeNotificationsRepo = NotificationsRepo & {
  queue: () => QueueRow[];
  tokens: () => { id: string; userId: string; token: string; platform: string }[];
  mutes: () => { userId: string; orgId: string }[];
  rules: () => RuleRow[];
};

export function createFakeNotificationsRepo(world: NotificationWorld, now: () => Date = () => new Date()): FakeNotificationsRepo {
  const rules: RuleRow[] = [];
  const tokens: { id: string; userId: string; token: string; platform: string }[] = [];
  const mutes: { userId: string; orgId: string }[] = [];
  const queue: QueueRow[] = [];
  const copy = <T extends object>(x: T): T => ({ ...x });

  return {
    queue: () => queue.map(copy),
    tokens: () => tokens.map(copy),
    mutes: () => mutes.map(copy),
    rules: () => rules.map(copy),

    async listRules(userId) {
      return rules.filter((r) => r.userId === userId).map(copy);
    },
    async countRules(userId) {
      return rules.filter((r) => r.userId === userId).length;
    },
    async insertRule(values) {
      const row: RuleRow = { id: randomUUID(), createdAt: now(), radiusMiles: null, types: "", immediate: false, paused: false, ...values } as RuleRow;
      rules.push(row);
      return copy(row);
    },
    async updateRule(id, userId, patch) {
      const row = rules.find((r) => r.id === id && r.userId === userId);
      if (!row) return null;
      Object.assign(row, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      return copy(row);
    },
    async deleteRule(id, userId) {
      const i = rules.findIndex((r) => r.id === id && r.userId === userId);
      if (i < 0) return false;
      rules.splice(i, 1);
      return true;
    },
    async findRule(id) {
      const row = rules.find((r) => r.id === id);
      return row ? copy(row) : null;
    },
    async candidateRules(_lat, orgId) {
      return rules
        .filter((r) => !r.paused && !mutes.some((m) => m.userId === r.userId && m.orgId === orgId))
        .map((rule) => ({ rule: copy(rule), timeZone: world.timeZones.get(rule.userId) ?? null }));
    },

    async upsertToken(userId, token, platform) {
      const existing = tokens.find((t) => t.token === token);
      if (existing) {
        existing.userId = userId;
        existing.platform = platform;
        return existing.id;
      }
      const row = { id: randomUUID(), userId, token, platform };
      tokens.push(row);
      return row.id;
    },
    async listTokens(userId) {
      return tokens.filter((t) => t.userId === userId).map(({ id, token }) => ({ id, token }));
    },
    async revokeToken(id, userId) {
      const i = tokens.findIndex((t) => t.id === id && t.userId === userId);
      if (i < 0) return false;
      tokens.splice(i, 1);
      return true;
    },
    async deleteTokenValues(values) {
      for (let i = tokens.length - 1; i >= 0; i--) if (values.includes(tokens[i].token)) tokens.splice(i, 1);
    },

    async getReminders(userId) {
      return !world.reminderOff.has(userId);
    },
    async setReminders(userId, reminders) {
      if (reminders) world.reminderOff.delete(userId);
      else world.reminderOff.add(userId);
      return true;
    },
    async timeZoneOf(userId) {
      return world.timeZones.get(userId) ?? null;
    },
    async addMute(userId, orgId) {
      if (!mutes.some((m) => m.userId === userId && m.orgId === orgId)) mutes.push({ userId, orgId });
    },
    async removeMute(userId, orgId) {
      const i = mutes.findIndex((m) => m.userId === userId && m.orgId === orgId);
      if (i >= 0) mutes.splice(i, 1);
    },

    async enqueue(items: NewQueueItem[]) {
      let added = 0;
      for (const item of items) {
        if (queue.some((q) => q.userId === item.userId && q.dedupeKey === item.dedupeKey)) continue;
        queue.push({ id: randomUUID(), status: "pending", attempts: 0, createdAt: now(), sentAt: null, ...item });
        added += 1;
      }
      return added;
    },
    async due(at, limit) {
      return queue
        .filter((q) => q.status === "pending" && q.sendAfter <= at)
        .sort((a, b) => a.sendAfter.getTime() - b.sendAfter.getTime() || a.id.localeCompare(b.id))
        .slice(0, limit)
        .map(copy);
    },
    async markSent(ids, at) {
      for (const q of queue) if (ids.includes(q.id)) Object.assign(q, { status: "sent", sentAt: at });
    },
    async markDropped(ids, at) {
      for (const q of queue) if (ids.includes(q.id)) Object.assign(q, { status: "dropped", sentAt: at });
    },
    async reschedule(id, sendAfter, attempts) {
      const q = queue.find((x) => x.id === id);
      if (q) Object.assign(q, { sendAfter, attempts });
    },
    async immediateSentSince(userId, since) {
      return queue.filter((q) => q.userId === userId && q.status === "sent" && q.kind === "new_event" && q.channel === "now" && q.sentAt !== null && q.sentAt >= since).length;
    },
    async orgNewEventsSince(userId, orgId, since) {
      return queue.filter((q) => q.userId === userId && q.orgId === orgId && q.kind === "new_event" && ["pending", "sent"].includes(q.status) && q.createdAt >= since).length;
    },
    async sentSince(since) {
      return queue.filter((q) => q.status === "sent" && q.sentAt !== null && q.sentAt >= since).length;
    },
    async purgeFinished(before) {
      const keep = queue.filter((q) => !(["sent", "dropped"].includes(q.status) && q.sentAt !== null && q.sentAt < before));
      const removed = queue.length - keep.length;
      queue.splice(0, queue.length, ...keep);
      return removed;
    },

    async savers(eventId) {
      return world.savers(eventId);
    },
    async reminderTargets(from, to) {
      return world.reminders(from, to).filter((r) => !world.reminderOff.has(r.userId));
    },
  };
}
