import { redact } from "@signalone/shared";

// Pure logger factory (no server-only import so it can be unit tested).
// Application code must import the shared instance from "@/lib/logger", which
// is server-only. The sink is the replacement point for an external
// logging/observability provider.

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogContext = Record<string, unknown>;

export type LogEntry = {
  level: LogLevel;
  time: string;
  message: string;
  /** Already redacted and JSON-safe. */
  context: LogContext;
};

export type LogSink = (entry: LogEntry) => void;

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** A logger that adds `bindings` (e.g. `{ requestId }`) to every entry. */
  child(bindings: LogContext): Logger;
};

export type LoggerOptions = {
  /** Minimum level emitted. Entries below it are dropped. */
  level?: LogLevel;
  sink?: LogSink;
  now?: () => Date;
};

const rank: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Production emits one JSON line per entry; development is human readable. */
export function consoleSink(production: boolean): LogSink {
  return (entry) => {
    const write = console[entry.level === "debug" ? "log" : entry.level];
    if (production) {
      write(JSON.stringify(entry));
    } else {
      const hasContext = Object.keys(entry.context).length > 0;
      write(
        `[${entry.level}] ${entry.message}`,
        ...(hasContext ? [JSON.stringify(entry.context, null, 2)] : []),
      );
    }
  };
}

export function createLogger(options: LoggerOptions = {}, bindings: LogContext = {}): Logger {
  const { level = "info", sink = consoleSink(false), now = () => new Date() } = options;

  const emit = (lvl: LogLevel, message: string, context?: LogContext) => {
    if (rank[lvl] < rank[level]) return;
    sink({
      level: lvl,
      time: now().toISOString(),
      message,
      context: redact({ ...bindings, ...context }) as LogContext,
    });
  };

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
    child: (b) => createLogger(options, { ...bindings, ...b }),
  };
}
