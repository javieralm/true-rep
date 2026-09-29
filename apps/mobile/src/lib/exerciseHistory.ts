import type { CompletedSet, Workout } from "@truerep/shared";

/** Lo que hizo el usuario en un ejercicio en una sesión pasada. */
export interface ExerciseSession {
  date: string;
  sets: CompletedSet[];
}

/** Contexto de un ejercicio para compararse mientras se registra. */
export interface ExerciseContext {
  /** Hasta las 3 últimas sesiones con desglose por serie, la más reciente primero. */
  sessions: ExerciseSession[];
  /** La mejor serie de todo el historial cargado: más lastre y, a igual lastre, más reps. */
  best: CompletedSet | null;
  /** Serie media de las últimas sesiones. */
  average: CompletedSet | null;
  /** % de cambio de carga entre la sesión más antigua de las 3 y la última. */
  trendPct: number | null;
}

/** Lo que se hizo en una serie: segundos en los ejercicios por tiempo
 * (L-sit, plancha), repeticiones en el resto. */
export function amount(s: CompletedSet): number {
  return s.seconds ?? s.reps;
}

/** Carga comparable de unas series. Con lastre cuenta kg × cantidad; a peso
 * corporal solo hay reps (o segundos), así que cuentan esas. */
export function load(sets: CompletedSet[]): number {
  return sets.reduce((sum, s) => sum + (s.weight_kg ? s.weight_kg * amount(s) : amount(s)), 0);
}

/** Tonelaje: solo la carga externa (lastre). El peso corporal no se registra. */
export function tonnage(sets: CompletedSet[]): number {
  return sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * s.reps, 0);
}

export function pctChange(now: number, before: number): number | null {
  return before > 0 ? Math.round(((now - before) / before) * 100) : null;
}

function beats(a: CompletedSet, b: CompletedSet): boolean {
  const wa = a.weight_kg ?? 0;
  const wb = b.weight_kg ?? 0;
  return wa !== wb ? wa > wb : amount(a) > amount(b);
}

/** Solo es récord si había algo que batir: la primera vez que se registra un
 * ejercicio no se celebra cada serie. */
export function isRecord(set: CompletedSet, best: CompletedSet | null): boolean {
  return !!best && amount(set) > 0 && beats(set, best);
}

export function exerciseContext(workouts: Workout[], exerciseId: string): ExerciseContext {
  // Los workouts antiguos no traen `sets`: sin desglose no hay con qué comparar serie a serie.
  const all = workouts
    .flatMap((w) => {
      const entry = w.exercises_completed.find((c) => c.exercise_id === exerciseId);
      return entry?.sets?.length ? [{ date: w.completed_at, sets: entry.sets }] : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const sessions = all.slice(0, 3);
  const best = all
    .flatMap((s) => s.sets)
    .reduce<CompletedSet | null>((top, s) => (amount(s) > 0 && (!top || beats(s, top)) ? s : top), null);

  const recent = sessions.flatMap((s) => s.sets);
  const weights = recent.map((s) => s.weight_kg).filter((w): w is number => w != null && w > 0);
  const avgAmount = recent.length ? Math.round(recent.reduce((sum, s) => sum + amount(s), 0) / recent.length) : 0;
  const timed = recent.some((s) => s.seconds != null);
  const average = recent.length
    ? {
        ...(timed ? { reps: 0, seconds: avgAmount } : { reps: avgAmount }),
        // Redondeado a medio kilo, que es el salto más pequeño de un disco.
        ...(weights.length
          ? { weight_kg: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 2) / 2 }
          : {}),
      }
    : null;

  const trendPct =
    sessions.length >= 2 ? pctChange(load(sessions[0].sets), load(sessions[sessions.length - 1].sets)) : null;

  return { sessions, best, average, trendPct };
}

/** Aviso no bloqueante sobre un valor raro comparado con la vez anterior.
 * Devuelve null si no hay nada que decir. */
export function setWarning(set: CompletedSet, ref: CompletedSet | undefined): string | null {
  const unit = set.seconds != null ? "s" : "reps";
  if (amount(set) === 0) return set.seconds != null ? "sin segundos, no contará" : "sin repeticiones, no contará";
  if (!ref) return null;
  const w = set.weight_kg ?? 0;
  const rw = ref.weight_kg ?? 0;
  if (rw > 0 && Math.abs(w - rw) / rw > 0.25) {
    return `${formatKg(w)} kg, un ${Math.round((Math.abs(w - rw) / rw) * 100)} % ${w > rw ? "más" : "menos"} que la última vez`;
  }
  if (amount(ref) > 0 && amount(set) > amount(ref) * 1.5) {
    return `${amount(set)} ${unit}, muy por encima de ${amount(ref)} ${unit} de la última vez`;
  }
  return null;
}

export function formatKg(kg: number): string {
  return String(Math.round(kg * 10) / 10).replace(".", ",");
}

export function formatSet(s: CompletedSet): string {
  const what = s.seconds != null ? `${s.seconds} s` : `${s.reps}`;
  if (s.weight_kg) return `${what} × ${formatKg(s.weight_kg)} kg`;
  return s.seconds != null ? what : `${s.reps} reps`;
}

export function formatSets(sets: CompletedSet[]): string {
  return sets.map(formatSet).join(" · ");
}

export function formatTrend(pct: number | null): string {
  if (pct == null) return "";
  return `${pct > 0 ? "↑" : pct < 0 ? "↓" : "→"} ${Math.abs(pct)} %`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
