import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// React refuses to start when "react" and "react-dom" differ ("Incompatible React versions"). The phone app
// pins "react" to the Expo SDK's version, while the web app uses a newer one, and pnpm will quietly pair the
// phone app with the web app's "react-dom" unless the phone app names its own. This reads what the phone
// app actually resolves, so a drift fails here and not as a red screen on a phone.
const require = createRequire(import.meta.url);
const versionOf = (name: string) => (require(`${name}/package.json`) as { version: string }).version;

describe("mobile React packages", () => {
  it("resolve react and react-dom to the exact same version", () => {
    expect(versionOf("react-dom")).toBe(versionOf("react"));
  });
});
