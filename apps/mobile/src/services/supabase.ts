import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

/** Cliente de Supabase, o null si no está configurado.
 *
 * Supabase solo se usa para el tiempo real de los leaderboards (alcance
 * diferido, ver TODOS.md); los datos llegan por la API. Antes el cliente se
 * construía al cargar el módulo con `?? ""`, y `createClient("")` lanza
 * "supabaseUrl is required" — con expo-router 57, que carga todas las rutas al
 * arrancar para validarlas, esa excepción tumbaba la app entera en el arranque
 * por una feature que ni siquiera está activa.
 *
 * Perezoso además de opcional: así el cliente solo se crea si alguien abre una
 * pantalla que de verdad lo necesita. */
export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    client = url && anonKey ? createClient(url, anonKey) : null;
  }
  return client;
}
