import type { ApiResponse } from "@truerep/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 15_000;

let getToken: (() => Promise<string | null>) | null = null;

/** El root layout registra el getter de token de Clerk una vez */
export function registerTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn;
}

/** Error de API que lleva el código HTTP encima.
 *
 * Sin el código, quien llama no puede distinguir "no tienes plan" (402) de "no
 * hay red", y acaba tratando cualquier fallo como si fuera lo mismo — que es
 * justo lo que hacía useSchedule tapándolo todo con un catch vacío.
 *
 * `status: 0` significa que la petición no llegó a hablar con el servidor. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken ? await getToken() : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      // Sin esto una petición colgada se queda colgada para siempre y la
      // pantalla se queda en "Cargando…" sin salida.
      signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (e) {
    // fetch solo rechaza por red o por aborto; cualquier respuesta HTTP, por
    // mal que pinte, resuelve. Se comprueban los dos nombres porque el fetch de
    // React Native rechaza con AbortError aunque la señal venga de
    // AbortSignal.timeout, que según el estándar debería dar TimeoutError.
    const aborted = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ApiError(
      aborted ? "La conexión ha tardado demasiado" : "No hay conexión con el servidor",
      0
    );
  }

  // Una 500 devuelve a veces el HTML de la página de error del hosting.
  // Parsearlo a ciegas le ponía al usuario "JSON Parse error: Unexpected
  // token <" en la cara en vez de algo que pueda entender.
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiError(
      res.ok ? "Respuesta ilegible del servidor" : `Error del servidor (${res.status})`,
      res.status
    );
  }

  if (!res.ok || body.status === "error") {
    throw new ApiError(body.message ?? `Error del servidor (${res.status})`, res.status);
  }

  // `data` puede ser null de forma legítima: GET /me/schedule responde ok(null)
  // cuando no hay programa asignado. Quien lo espere lo declara en la llamada
  // (api<DaySchedule | null>), que es donde se sabe si null es válido o no.
  return body.data as T;
}
