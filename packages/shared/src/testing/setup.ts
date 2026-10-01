// Vitest setup file for every unit-test project (see /docs/testing.md).
// Guarantees unit tests start without DB credentials or environment identity,
// so nothing can reach Neon by accident.
import { afterEach, beforeEach, vi } from "vitest";

import { clearIsolatedEnv } from "./index";

beforeEach(() => clearIsolatedEnv());
afterEach(() => vi.unstubAllEnvs());
