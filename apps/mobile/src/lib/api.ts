import type { ApiResponse } from "@truerep/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

let getToken: (() => Promise<string | null>) | null = null;

/** El root layout registra el getter de token de Clerk una vez */
export function registerTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken ? await getToken() : null;
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.status === "error" || json.data === null) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}
