import type { Exercise, LibraryExercise } from "@truerep/shared";

/** Completa los ejercicios de una rutina con lo que diga la librería del
 * entrenador. La rutina guarda una copia de cada ejercicio hecha al añadirlo,
 * así que lo que el entrenador cambie después en la librería (marcar que admite
 * segundos, subir un vídeo de técnica) no llegaba a las rutinas ya creadas.
 * Lo que la propia rutina ya diga manda: esto solo rellena huecos. */
export function withLibraryDefaults(
  exercises: Exercise[],
  library: Pick<LibraryExercise, "id" | "measure" | "video_url">[]
): Exercise[] {
  const byId = new Map(library.map((l) => [l.id, l]));
  return exercises.map((ex) => {
    const lib = ex.exercise_id ? byId.get(ex.exercise_id) : undefined;
    if (!lib) return ex;
    return {
      ...ex,
      ...(!ex.measure && lib.measure === "seconds" ? { measure: "seconds" as const } : {}),
      ...(!ex.technique_video_url && lib.video_url ? { technique_video_url: lib.video_url } : {}),
    };
  });
}
