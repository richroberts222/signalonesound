import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Automation-friendly identifiers (docs/automation/acceptance.md, docs/ui.md section 9b).
// Every interactive element (button, input, link, select and similar) carries a stable
// data-testid, so end-to-end and acceptance tests never depend on text or styling.
//
// Ratchet: the files below pre-date the rule and are exempt until they are converted. A NEW
// component file must comply from the start, and a baseline file that is fully converted must be
// removed from the list so it can never regress. When the list is empty the rule is fully enforced.
const BASELINE: string[] = [
  "app/account/notifications/page.tsx",
  "app/account/page.tsx",
  "app/admin/events/[eventId]/page.tsx",
  "app/admin/organizations/[orgId]/page.tsx",
  "app/admin/page.tsx",
  "app/dashboard/church/events/[eventId]/edit/page.tsx",
  "app/dashboard/church/events/[eventId]/page.tsx",
  "app/dashboard/church/events/new/page.tsx",
  "app/dashboard/church/page.tsx",
  "app/dashboard/page.tsx",
  "app/discover/[eventId]/page.tsx",
  "app/page.tsx",
  "components/admin/confirm-mock-action.tsx",
  "components/admin/event-browser.tsx",
  "components/admin/import-wizard.tsx",
  "components/admin/mock-edit-form.tsx",
  "components/admin/org-browser.tsx",
  "components/admin/submission-queue.tsx",
  "components/church/event-editor.tsx",
  "components/church/manage-actions.tsx",
  "components/church/managed-event-card.tsx",
  "components/discover/discover-experience.tsx",
  "components/discover/discover-filters.tsx",
  "components/discover/event-actions.tsx",
  "components/discover/event-card.tsx",
  "components/discover/filter-chip.tsx",
  "components/discover/save-button.tsx",
  "components/member/invite-friends.tsx",
  "components/member/notification-preferences.tsx",
  "components/shell/app-header.tsx",
];

const ROOT = join(__dirname, "..", "..");
const INTERACTIVE = new Set([
  "a", "button", "input", "select", "textarea",
  "Button", "Input", "Textarea", "Select", "SelectTrigger", "Checkbox", "Switch", "RadioGroupItem", "Link", "TabsTrigger",
]);

/** Names of interactive tags in the source that have no data-testid attribute. */
export function untaggedInteractive(source: string): string[] {
  const missing: string[] = [];
  const opener = /<([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g;
  for (let m = opener.exec(source); m; m = opener.exec(source)) {
    if (!INTERACTIVE.has(m[1])) continue;
    // Read the opening tag up to the first ">" outside braces and quotes, keeping only this tag's
    // own attributes (text inside braces, such as a nested element passed as a prop, is not its own).
    let depth = 0;
    let quote = "";
    let own = "";
    let spread = false;
    let i = m.index + m[0].length;
    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        if (depth === 0) own += c;
        if (c === quote && source[i - 1] !== "\\") quote = "";
      } else if (c === '"' || c === "'" || (c === "`" && depth > 0)) {
        quote = c;
        if (depth === 0) own += c;
      } else if (c === "{") {
        if (depth === 0 && /^\{\s*\.\.\./.test(source.slice(i, i + 8))) spread = true;
        depth++;
      } else if (c === "}") {
        depth = Math.max(0, depth - 1);
      } else if (c === ">" && depth === 0) {
        break;
      } else if (depth === 0) {
        own += c;
      }
    }
    if (!spread && !/\bdata-testid\s*=/.test(own)) missing.push(m[1]);
    // Continue just after the tag name so elements nested inside this tag's props are examined too.
    opener.lastIndex = m.index + m[0].length;
  }
  return missing;
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? tsxFiles(full) : full.endsWith(".tsx") ? [full] : [];
  });
}

function violations(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const top of ["app", "components"]) {
    for (const file of tsxFiles(join(ROOT, top))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      if (rel.startsWith("components/ui/")) continue; // primitives take their id from the caller
      // The demo slice is deleted from generated applications, so it cannot be listed in the baseline.
      if (rel.startsWith("components/proof/")) continue;
      const n = untaggedInteractive(readFileSync(file, "utf8")).length;
      if (n > 0) out[rel] = n;
    }
  }
  return out;
}

describe("test identifiers on interactive elements", () => {
  it("new component files put a data-testid on every interactive element", () => {
    const actual = violations();
    if (process.env.PRINT_TESTID_BASELINE === "1") console.log(JSON.stringify(Object.keys(actual).sort(), null, 2));
    const baseline = new Set(BASELINE);
    const offenders = Object.entries(actual).filter(([f]) => !baseline.has(f));
    expect(offenders, "add data-testid (kebab-case, <feature>-<element>[-<action>]) to these interactive elements").toEqual([]);
  });

  it("keeps the baseline tight so it only shrinks", () => {
    const actual = violations();
    const stale = BASELINE.filter((f) => existsSync(join(ROOT, f)) && !(f in actual));
    expect(stale, "these files are fully converted: remove them from BASELINE").toEqual([]);
  });

  it("the scan reads tags with arrow functions, spreads and render props correctly (self-test)", () => {
    expect(untaggedInteractive('<Button onClick={() => go()} data-testid="save">Save</Button>')).toEqual([]);
    expect(untaggedInteractive("<Button onClick={() => go()}>Save</Button>")).toEqual(["Button"]);
    expect(untaggedInteractive('<input type="text" value={a > b ? "x" : "y"} />')).toEqual(["input"]);
    expect(untaggedInteractive('<a href="/x" data-testid="x-link">x</a><div onClick={() => 1}>not interactive</div>')).toEqual([]);
    expect(untaggedInteractive('<Link href="/a">a</Link><Link href="/b" data-testid="b">b</Link>')).toEqual(["Link"]);
    expect(untaggedInteractive('<Button render={<a href="/x" />}>x</Button>').length).toBe(2);
    expect(untaggedInteractive("<Input {...props} />")).toEqual([]);
  });
});
