import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Base UI Button assumes it renders a native <button>. When a Button is rendered as something else
// (render={<Link ... />} or <a>), it must say so with nativeButton={false}, or Base UI logs a console error
// ("expected a native <button>") and the element loses its button semantics. The error only shows up when
// that page is opened in development, so this scans the source for it.
const root = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".next") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

/** The text of the opening tag of each <Button ...>, ending at the first ">" outside braces. */
export function buttonOpeningTags(source: string): string[] {
  const tags: string[] = [];
  for (let start = source.indexOf("<Button"); start !== -1; start = source.indexOf("<Button", start + 1)) {
    const next = source[start + "<Button".length];
    if (next !== " " && next !== "\n" && next !== ">" && next !== "\r") continue; // <ButtonGroup, <Buttons ...
    let depth = 0;
    for (let i = start + 1; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      else if (source[i] === ">" && depth === 0) {
        tags.push(source.slice(start, i + 1));
        break;
      }
    }
  }
  return tags;
}

export const needsNativeButtonFalse = (tag: string) => /\brender=\{\s*</.test(tag) && !/\bnativeButton=\{false\}/.test(tag);

describe("Button rendered as another element", () => {
  it("recognises the problem and the fix", () => {
    expect(needsNativeButtonFalse('<Button render={<Link href="/x" />}>')).toBe(true);
    expect(needsNativeButtonFalse('<Button nativeButton={false} render={<Link href="/x" />}>')).toBe(false);
    expect(needsNativeButtonFalse('<Button render={<a href="/x" />} nativeButton={false}>')).toBe(false);
    expect(needsNativeButtonFalse("<Button onClick={go}>")).toBe(false);
  });

  it("finds the tag even when it spans lines and contains > inside braces", () => {
    const tags = buttonOpeningTags('<Button\n  variant="outline"\n  render={<Link href="/x" />}\n>\n  Go\n</Button><ButtonGroup>');
    expect(tags).toHaveLength(1);
    expect(needsNativeButtonFalse(tags[0])).toBe(true);
  });

  it("every Button in the web app that renders as a link or other element says nativeButton={false}", () => {
    const offenders = sourceFiles(root).flatMap((file) =>
      buttonOpeningTags(readFileSync(file, "utf8"))
        .filter(needsNativeButtonFalse)
        .map((tag) => `${relative(root, file)}: ${tag.replace(/\s+/g, " ").slice(0, 100)}`),
    );
    expect(offenders).toEqual([]);
  });
});
