/** Envío de push vía Expo Push Service. Sin SDK: es un POST simple. */

export interface PushMessage {
  to: string; // ExponentPushToken[...]
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100; // límite de Expo por request

/** Envía en lotes. Devuelve los tokens rechazados (DeviceNotRegistered) para desactivarlos. */
export async function sendPushNotifications(messages: PushMessage[]): Promise<string[]> {
  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Encoding": "gzip, deflate" },
        body: JSON.stringify(chunk.map((m) => ({ sound: "default", ...m }))),
      });
      const json = (await res.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      json.data?.forEach((ticket, idx) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(chunk[idx].to);
        }
      });
    } catch (e) {
      console.error("Expo push batch failed:", e);
    }
  }

  return invalidTokens;
}

/** Hora local (0-23) de un usuario según su timezone IANA. Sin dependencias. */
export function localHour(timezone: string, now = new Date()): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(now),
      10
    );
  } catch {
    return now.getUTCHours(); // timezone inválida → UTC
  }
}

/** ¿Es `date` el mismo día que `now` en la timezone dada? */
export function isSameLocalDay(date: Date, timezone: string, now = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, dateStyle: "short" });
  try {
    return fmt.format(date) === fmt.format(now);
  } catch {
    return date.toDateString() === now.toDateString();
  }
}
