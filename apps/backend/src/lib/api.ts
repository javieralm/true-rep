import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

/** Regla no negociable #2: toda respuesta API usa esta forma */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(
    { data, status: "success" as const, timestamp: new Date().toISOString() },
    { status }
  );
}

export function fail(message: string, status = 400) {
  return NextResponse.json(
    { data: null, status: "error" as const, message, timestamp: new Date().toISOString() },
    { status }
  );
}

/** Valida body con Zod; lanza respuesta 400 legible en vez de 500 */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw fail("Invalid JSON body", 400);
  });
  try {
    return schema.parse(json);
  } catch (e) {
    if (e instanceof ZodError) {
      throw fail(e.errors.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
    }
    throw e;
  }
}

/** Envuelve un handler: los `throw fail(...)` se devuelven como respuesta */
export function handler(fn: (...args: any[]) => Promise<Response>) {
  return async (...args: any[]): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return fail("Internal server error", 500);
    }
  };
}
