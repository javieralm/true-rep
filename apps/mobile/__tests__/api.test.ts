import { api, ApiError, registerTokenGetter } from "@/lib/api";

// globalThis y no global: sin @types/node, `global` no existe para TypeScript.
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

/** Respuesta con cuerpo JSON, como la que devuelven los helpers del backend. */
function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Una 500 del hosting devuelve HTML, no JSON: res.json() revienta. */
function htmlRes(status = 500) {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON at position 0");
    },
  } as unknown as Response;
}

const success = <T,>(data: T) => ({ data, status: "success", timestamp: "2026-01-01T00:00:00.000Z" });
const failure = (message: string) => ({
  data: null,
  status: "error",
  message,
  timestamp: "2026-01-01T00:00:00.000Z",
});

beforeEach(() => {
  mockFetch.mockReset();
  registerTokenGetter(async () => null);
});

describe("api() · respuestas correctas", () => {
  it("devuelve data", async () => {
    mockFetch.mockResolvedValue(jsonRes(success({ id: "u1" })));

    await expect(api("/users/me")).resolves.toEqual({ id: "u1" });
  });

  it("antepone /api a la ruta", async () => {
    mockFetch.mockResolvedValue(jsonRes(success(null)));

    await api("/me/schedule");

    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/me\/schedule$/);
  });

  // GET /me/schedule responde ok(null) cuando el usuario no tiene programa
  // asignado: es una respuesta válida, no un fallo. Antes api() lanzaba con
  // cualquier data null y useSchedule lo tapaba con un try/catch.
  it("data: null con status success se devuelve tal cual, sin lanzar", async () => {
    mockFetch.mockResolvedValue(jsonRes(success(null)));

    await expect(api("/me/schedule")).resolves.toBeNull();
  });
});

describe("api() · errores", () => {
  it("un status error lanza ApiError con el mensaje del servidor y el código HTTP", async () => {
    mockFetch.mockResolvedValue(jsonRes(failure("Active subscription required"), 402));

    await expect(api("/me/stats")).rejects.toMatchObject({
      name: "ApiError",
      message: "Active subscription required",
      status: 402,
    });
  });

  // El fallo que esto vigila: el usuario veía "JSON Parse error: Unexpected
  // token <" cuando el hosting devolvía su página de error en HTML.
  it("un cuerpo que no es JSON da un mensaje legible, no un error de parseo", async () => {
    mockFetch.mockResolvedValue(htmlRes(500));

    const err = await api("/users/me").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect((err as ApiError).message).not.toMatch(/JSON|token/i);
  });

  it("un 4xx sin status error en el cuerpo también lanza", async () => {
    mockFetch.mockResolvedValue(jsonRes(success(null), 404));

    await expect(api("/routines/nope")).rejects.toBeInstanceOf(ApiError);
  });

  it("un fallo de red lanza ApiError con status 0", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(api("/users/me")).rejects.toMatchObject({ name: "ApiError", status: 0 });
  });

  it("un timeout lanza ApiError con status 0 y se distingue en el mensaje", async () => {
    const timeout = new Error("The signal timed out.");
    timeout.name = "TimeoutError";
    mockFetch.mockRejectedValue(timeout);

    const err = (await api("/users/me").catch((e: unknown) => e)) as ApiError;

    expect(err.status).toBe(0);
    expect(err.message).toMatch(/tardado/i);
  });
});

describe("api() · autenticación", () => {
  it("adjunta el Bearer cuando hay token", async () => {
    registerTokenGetter(async () => "tok_123");
    mockFetch.mockResolvedValue(jsonRes(success({})));

    await api("/users/me");

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok_123");
  });

  it("no adjunta Authorization cuando no hay token", async () => {
    mockFetch.mockResolvedValue(jsonRes(success({})));

    await api("/users/me");

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
