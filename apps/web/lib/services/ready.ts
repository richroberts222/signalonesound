import { ServiceError } from "./errors";

// Readiness for uptime monitoring (docs/features/s9-launch-gate.md, AC6): is this deployment able to do its job, which
// means can it reach its database. Liveness (`/api/v1/status`) only says the code is running. A failing or slow database
// answers "unavailable" (HTTP 503) with a fixed message; the reason goes only to the error hook, never to the caller,
// because this endpoint is public. Framework-free; the ping and the timeout are injected.
export type ReadyServiceDeps = {
  ping: () => Promise<void>;
  /** A database that takes longer than this is not ready. */
  timeoutMs?: number;
};

export type ReadyService = ReturnType<typeof createReadyService>;

export const READY_TIMEOUT_MS = 3000;

export function createReadyService({ ping, timeoutMs = READY_TIMEOUT_MS }: ReadyServiceDeps) {
  return {
    async check(): Promise<{ status: "ready" }> {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          ping(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("database check timed out")), timeoutMs);
          }),
        ]);
        return { status: "ready" };
      } catch {
        throw new ServiceError("unavailable", "The service is not ready");
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}
