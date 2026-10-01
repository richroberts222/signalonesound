import "server-only";

import { consoleSink, createLogger, type LogLevel } from "./create-logger";

// Server-only. Import the shared logger from here; never from client components.
// Level: debug in development, info in production, warn in tests (quiet).
const production = process.env.NODE_ENV === "production";
const level: LogLevel = production ? "info" : process.env.NODE_ENV === "test" ? "warn" : "debug";

export const logger = createLogger({ level, sink: consoleSink(production) });

export { createLogger, consoleSink } from "./create-logger";
export type { LogContext, LogEntry, LogLevel, LogSink, Logger } from "./create-logger";
export { reportError } from "./report-error";
