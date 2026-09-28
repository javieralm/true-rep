/** Variable de entorno obligatoria. Falla ruidosamente y nombrando la variable
 * en vez de degradar en silencio con `?? ""`, que convierte un deploy mal
 * configurado en un error confuso de un SDK de terceros mucho más tarde. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
