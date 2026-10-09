// Sending a push message to a phone (S7). A port, so the app runs and is tested without any provider.
// The message is only ever a title and a short body (no sensitive content), plus the id of the event so
// the app can open it.
export type PushMessage = { to: string; title: string; body: string; data: { eventId?: string } };
export type PushResult = { to: string; status: "ok" | "invalid" | "error" };
export type PushPort = { send(messages: PushMessage[]): Promise<PushResult[]> };

/**
 * The development default: nothing leaves the server. It reports every message as delivered so the rest
 * of the flow can be exercised, and records only a count, never a token or text.
 */
export function createLoggingPush(write: (line: string) => void = (line) => console.info(line)): PushPort {
  return {
    async send(messages) {
      write(JSON.stringify({ event: "push.not_sent", count: messages.length, reason: "no push provider is configured" }));
      return messages.map((m) => ({ to: m.to, status: "ok" as const }));
    },
  };
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

/**
 * Expo's free push service. It sees the phone's push address and the short title and body, nothing
 * else. A device the service says is no longer registered is reported as invalid so it can be removed.
 */
export function createExpoPush(fetchImpl: FetchLike = (url, init) => fetch(url, init) as ReturnType<FetchLike>): PushPort {
  return {
    async send(messages) {
      const results: PushResult[] = [];
      for (let i = 0; i < messages.length; i += BATCH) {
        const batch = messages.slice(i, i + BATCH);
        try {
          const res = await fetchImpl(EXPO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(batch.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data, sound: "default" }))),
          });
          const json = (await res.json()) as { data?: { status?: string; details?: { error?: string } }[] };
          if (!res.ok || !Array.isArray(json.data)) throw new Error("push service error");
          batch.forEach((m, index) => {
            const ticket = json.data![index];
            if (ticket?.status === "ok") results.push({ to: m.to, status: "ok" });
            else if (ticket?.details?.error === "DeviceNotRegistered") results.push({ to: m.to, status: "invalid" });
            else results.push({ to: m.to, status: "error" });
          });
        } catch {
          for (const m of batch) results.push({ to: m.to, status: "error" });
        }
      }
      return results;
    },
  };
}
