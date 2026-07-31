/** Fetch del dashboard (client components): desenvuelve el envelope de la API */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (json.status === "error") throw new Error(json.message ?? `Request failed (${res.status})`);
  return json.data as T;
}
