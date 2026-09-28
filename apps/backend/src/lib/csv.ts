/** Escapa un valor para una celda CSV (RFC 4180): comillas si contiene coma, comilla o salto de línea */
export function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsvRow(values: (string | number)[]): string {
  return values.map((v) => csvEscape(String(v))).join(",");
}
