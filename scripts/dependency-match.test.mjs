// Self-test for the dependency cross-check: node --test scripts/dependency-match.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findDependencyProblems, readWorkspaces } from "./dependency-match.mjs";

const ws = (name, dependencies = {}, devDependencies = {}) => ({ name, dependencies, devDependencies });

describe("dependency-match", () => {
  it("accepts react and react-dom pinned to the same exact version", () => {
    assert.deepEqual(findDependencyProblems([ws("mobile", { react: "19.2.3", "react-dom": "19.2.3" }), ws("web", { react: "19.2.8", "react-dom": "19.2.8" })]), []);
  });

  it("fails an app whose react and react-dom differ (the phone app's red screen)", () => {
    const problems = findDependencyProblems([ws("mobile", { react: "19.2.3", "react-dom": "19.2.8" })]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /mobile: react \(19\.2\.3\) and react-dom \(19\.2\.8\)/);
  });

  it("fails an app that names react but not react-dom, and a range instead of an exact version", () => {
    assert.match(findDependencyProblems([ws("mobile", { react: "19.2.3" })])[0], /does not name react-dom/);
    assert.match(findDependencyProblems([ws("web", { react: "^19.2.3", "react-dom": "^19.2.3" })])[0], /same exact version/);
  });

  it("does not require react-dom of a library that only lists react as a dev dependency", () => {
    assert.deepEqual(findDependencyProblems([ws("lib", {}, { react: "19.2.3" })]), []);
  });

  it("fails a package declared with different majors in two workspaces, but not with the same major", () => {
    assert.match(findDependencyProblems([ws("a", { zod: "^3.0.0" }), ws("b", { zod: "^4.1.0" })])[0], /zod: different major versions/);
    assert.deepEqual(findDependencyProblems([ws("a", { zod: "^4.0.0" }), ws("b", { zod: "~4.6.5" })]), []);
  });

  it("ignores workspace links and the recorded known differences", () => {
    assert.deepEqual(findDependencyProblems([ws("a", { "@signalone/shared": "workspace:*" }), ws("b", { "@signalone/shared": "workspace:^" })]), []);
    assert.deepEqual(findDependencyProblems([ws("a", {}, { typescript: "~6.0.3" }), ws("b", {}, { typescript: "^5" })]), []);
  });

  it("holds for this repository: every app and package agrees", () => {
    assert.deepEqual(findDependencyProblems(readWorkspaces(process.cwd())), []);
  });
});
