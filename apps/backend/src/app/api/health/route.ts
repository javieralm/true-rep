import { ok } from "@/lib/api";

export function GET() {
  // "app_status", no "status": el envelope de ok() ya tiene su propio
  // status:"success"/"error" — reusar el nombre confundía a quien leyera
  // la respuesta cruda ({ data: { status: "ok" }, status: "success" }).
  return ok({ app_status: "ok" });
}
