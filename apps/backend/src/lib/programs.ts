/** Posición actual dentro de un programa. day 1 = mismo día de la semana que start_date. */
export function programPosition(startDate: Date, now: Date) {
  const msPerDay = 86_400_000;
  const days = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
  if (days < 0) return { week: 0, day: 0 }; // aún no ha empezado
  return { week: Math.floor(days / 7) + 1, day: (days % 7) + 1 };
}

/** Rango [inicio, fin) de una semana concreta del programa */
export function weekRange(startDate: Date, week: number) {
  const start = new Date(startDate.getTime() + (week - 1) * 7 * 86_400_000);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}
