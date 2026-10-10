// Shared inventory for the boilerplate tooling (see /docs/boilerplate.md).
// Plain Node, no dependencies. Both init-app.mjs and check-boilerplate.mjs read
// this file so the two can never disagree about what is proof-only.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** PROOF-ONLY: generic vertical-slice artifacts (Issue 49) and the proof migrations (Issues 43, 49). */
export const PROOF_PATHS = [
  "apps/web/app/api/v1/proof-items",
  "apps/web/app/proof",
  "apps/web/components/proof",
  "apps/web/db/proof-items.ts",
  "apps/web/db/proof-items.fake.ts",
  "apps/web/db/proof-items.integration.test.ts",
  "apps/web/drizzle",
  "apps/web/e2e/proof-items.spec.ts",
  "apps/web/lib/api/proof-items.ts",
  "apps/web/lib/api/proof-items.acceptance-suite.ts",
  "apps/web/lib/api/proof-items.acceptance.test.ts",
  "apps/web/lib/services/proof-items.ts",
  "apps/web/lib/services/proof-items.test.ts",
  "apps/mobile/src/proof",
  "packages/validation/src/proof-item.ts",
  "packages/validation/src/proof-item.test.ts",
  "packages/validation/src/proof-item-client.ts",
  // S1 identity and policy (docs/features/s1-identity-and-policy.md): product code of the reference app.
  "apps/web/app/api/v1/me",
  "apps/web/app/api/v1/webhooks",
  "apps/web/db/member.ts",
  "apps/web/db/member.fake.ts",
  "apps/web/db/member-tables.test.ts",
  "apps/web/lib/api/member.ts",
  "apps/web/lib/api/member.acceptance.test.ts",
  "apps/web/lib/auth/clerk-identity-admin.ts",
  "apps/web/lib/auth/clerk-webhook.ts",
  "apps/web/lib/services/member.ts",
  "packages/validation/src/profile.ts",
  "packages/validation/src/profile.test.ts",
  "packages/validation/src/profile-client.ts",
  "apps/web/e2e/identity.spec.ts",
  "apps/web/app/about",
  // S2 organizations and roles (docs/features/s2-organizations-and-roles.md): product code of the reference app.
  "apps/web/app/account/organizations",
  "apps/web/app/admin/manager-requests",
  "apps/web/app/api/v1/admin",
  "apps/web/app/api/v1/organizations",
  "apps/web/app/claim-church",
  "apps/web/components/admin/manager-requests-queue.tsx",
  "apps/web/components/church/claim-church-form.tsx",
  "apps/web/components/church/my-organizations.tsx",
  "apps/web/db/organizations.ts",
  "apps/web/db/organizations.fake.ts",
  "apps/web/db/organizations.integration.test.ts",
  "apps/web/lib/api/organizations.ts",
  "apps/web/lib/api/organizations.acceptance.test.ts",
  "apps/web/lib/auth/admin.ts",
  "apps/web/lib/services/organizations.ts",
  "packages/validation/src/organization.ts",
  "packages/validation/src/organization.test.ts",
  "packages/validation/src/organization-client.ts",
  // S3 events (docs/features/s3-events-church-portal.md): product code of the reference app.
  "apps/web/app/api/v1/events",
  "apps/web/app/manage",
  "apps/web/components/events",
  "apps/web/db/events.ts",
  "apps/web/db/events.fake.ts",
  "apps/web/db/events.integration.test.ts",
  "apps/web/lib/api/events.ts",
  "apps/web/lib/api/events.acceptance.test.ts",
  "apps/web/lib/services/events.ts",
  "packages/validation/src/event.ts",
  "packages/validation/src/event-client.ts",
  // S4 discover (docs/features/s4-discover-web.md): product code of the reference app.
  "apps/web/app/churches",
  "apps/web/app/events",
  "apps/web/app/api/v1/places",
  "apps/web/data",
  "apps/web/db/discover.integration.test.ts",
  "apps/web/lib/api/discover.ts",
  "apps/web/lib/api/discover.acceptance.test.ts",
  "apps/web/lib/date-presets.ts",
  "apps/web/lib/date-presets.test.ts",
  "apps/web/lib/ics.ts",
  "apps/web/lib/ics.test.ts",
  "apps/web/lib/places",
  "apps/web/lib/services/discover.ts",
  "apps/web/scripts/build-gazetteer.ts",
  "apps/web/db/demo-seed.ts",
  "apps/web/db/demo-seed.test.ts",
  "apps/web/scripts/db-seed-demo.ts",
  "packages/validation/src/discover.ts",
  "packages/validation/src/discover-client.ts",
  // S6 saved events and invites (docs/features/s6-saved-events-and-invites.md): product code of the reference app.
  "apps/web/app/account/invite",
  "apps/web/lib/cron-config.test.ts",
  "apps/web/vercel.json",
  "apps/web/app/api/v1/internal",
  "apps/web/app/api/v1/invites",
  "apps/web/app/invite",
  "apps/web/app/saved",
  "apps/web/db/saved.ts",
  "apps/web/db/saved.fake.ts",
  "apps/web/db/saved.integration.test.ts",
  "apps/web/lib/api/saved.ts",
  "apps/web/lib/api/saved.acceptance.test.ts",
  "apps/web/lib/auth/job-secret.ts",
  "apps/web/lib/services/saved.ts",
  "packages/validation/src/saved.ts",
  "packages/validation/src/saved-client.ts",
  // S8 admin and moderation (docs/features/s8-admin-and-moderation.md): product code of the reference app.
  "apps/web/app/admin/audit",
  "apps/web/app/admin/moderation",
  "apps/web/app/api/v1/reports",
  "apps/web/components/admin/audit-viewer.tsx",
  "apps/web/components/admin/moderation-console.tsx",
  "apps/web/components/events/report-button.tsx",
  "apps/web/db/moderation.ts",
  "apps/web/db/moderation.fake.ts",
  "apps/web/db/moderation.integration.test.ts",
  "apps/web/lib/api/moderation.ts",
  "apps/web/lib/api/moderation.acceptance.test.ts",
  "apps/web/lib/auth/clerk-email-lookup.ts",
  "apps/web/lib/messaging",
  "apps/web/lib/services/moderation.ts",
  "packages/validation/src/moderation.ts",
  "packages/validation/src/moderation-client.ts",
  // S7 alerts and push (docs/features/s7-alerts-and-push.md): product code of the reference app.
  "apps/web/app/alerts",
  "apps/web/app/api/v1/unsubscribe",
  "apps/web/app/unsubscribe",
  "apps/web/components/events/alerts-manager.tsx",
  "apps/web/components/events/unsubscribe-confirm.tsx",
  "apps/web/db/notifications.ts",
  "apps/web/db/notifications.fake.ts",
  "apps/web/db/notifications.integration.test.ts",
  "apps/web/lib/api/alerts.ts",
  "apps/web/lib/api/alerts.acceptance.test.ts",
  "apps/web/lib/notifications",
  "apps/web/lib/services/alerts.ts",
  "apps/web/lib/services/notifier.ts",
  "apps/web/lib/services/notifier.test.ts",
  "packages/validation/src/alerts.ts",
  "packages/validation/src/alerts-client.ts",
  // S5 mobile discover (docs/features/s5-discover-mobile.md): the reference app's screens. A generated app keeps app/_layout.tsx and
  // app/index.tsx, which are overwritten from scripts/boilerplate/templates.
  "apps/mobile/app/(tabs)",
  "apps/mobile/app/event",
  "apps/mobile/src/account",
  "apps/mobile/src/api.ts",
  "apps/mobile/src/discover",
  "apps/web/lib/brand-name.test.ts",
  "apps/web/app/accept-terms",
  "apps/web/app/account/settings",
  "apps/web/app/contact",
  "apps/web/app/privacy",
  "apps/web/app/terms",
  "apps/web/components/legal",
  "apps/web/components/member/account-settings.tsx",
  "apps/web/components/shell/policy-gate.tsx",
  "apps/web/components/shell/site-footer.tsx",
];

/** Files that only make sense in the template repository. */
export const TEMPLATE_ONLY_PATHS = [
  "docs/boilerplate.md",
  "scripts/boilerplate",
];

/**
 * Signal One Sound product documentation: lives only in the reference app. Export
 * never copies it and init removes it, so both paths treat it identically.
 */
export const REFERENCE_ONLY_PATHS = ["docs/naming-conventions.md", "docs/code-quality-audit.md", "docs/how-to.md", "docs/product-development.md", "docs/features", "docs/product", "docs/audit"];

/** Reference-app-only tooling and files; never copied into the standalone boilerplate. */
export const EXPORT_EXCLUDED_PATHS = [
  "scripts/boilerplate/export-template.mjs",
  "scripts/boilerplate/templates/standalone",
  "docs/boilerplate.md",
  "docs/notes.md",
  ...REFERENCE_ONLY_PATHS,
];

/** Directories never scanned or copied. */
export const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".expo", "dist", ".turbo", "playwright-report", "test-results"]);

/** Never scanned: these hold local, gitignored configuration by design. */
export const isLocalEnvFile = (name) => /^\.env(\..+)?$/.test(name) && name !== ".env.example" && name !== ".env.sample";

const posix = (p) => p.split(path.sep).join("/");

/** All files under `root` as posix paths relative to it. */
export function walk(root, dir = root) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(root, full) : [posix(path.relative(root, full))];
  });
}

/**
 * Files to copy when building a template or a test copy: only what git tracks, so
 * untracked scratch files and local settings can never travel. Falls back to a
 * folder walk when `root` is not a git checkout (for example an exported template).
 */
export function listSourceFiles(root) {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) return walk(root);
  return result.stdout.split("\0").filter((f) => f && existsSync(path.join(root, f)));
}
