import { z } from "zod";

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const exerciseSchema = z.object({
  id: z.string().min(1),
  exercise_id: z.string().optional(), // referencia a la librería si viene de ella
  name: z.string().min(1).max(100),
  reps: z.string().optional(),
  sets: z.number().int().min(1).max(20).optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
  target_weight_kg: z.number().min(0).max(500).optional(),
  duration_seconds: z.number().int().positive().optional(),
  technique_video_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

// ─── Librería de ejercicios ───
export const createExerciseSchema = z.object({
  name: z.string().min(2).max(100),
  muscle_group: z.string().max(50).optional(),
  equipment: z.string().max(100).optional(),
  video_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  description: z.string().max(2000).optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

// ─── Programas semanales ───
export const createProgramSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
});

export const programItemTypeSchema = z.enum(["ROUTINE", "MESSAGE", "VIDEO", "NOTE", "SESSION"]);

// Payload flexible por tipo (se guarda en ProgramItem.data Json)
export const programTaskDataSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  url: z.string().url().optional(),
  mode: z.enum(["presencial", "online"]).optional(),
  location: z.string().max(200).optional(),
  time: z.string().max(20).optional(), // "18:30"
});

export const programItemSchema = z
  .object({
    week: z.number().int().min(1).max(52),
    day: z.number().int().min(1).max(7),
    order: z.number().int().min(0).default(0),
    type: programItemTypeSchema.default("ROUTINE"),
    routine_id: z.string().min(1).nullish(),
    data: programTaskDataSchema.nullish(),
  })
  .superRefine((it, ctx) => {
    if (it.type === "ROUTINE" && !it.routine_id)
      ctx.addIssue({ code: "custom", message: "routine_id requerido para ROUTINE", path: ["routine_id"] });
    if (it.type === "VIDEO" && !it.data?.url)
      ctx.addIssue({ code: "custom", message: "url requerida para VIDEO", path: ["data", "url"] });
    if (
      (it.type === "MESSAGE" || it.type === "NOTE" || it.type === "SESSION") &&
      !it.data?.title &&
      !it.data?.body
    )
      ctx.addIssue({ code: "custom", message: "título o texto requerido", path: ["data"] });
  });

export const updateProgramSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  items: z.array(programItemSchema).max(500).optional(), // replace completo
});

export const assignProgramSchema = z.object({
  user_id: z.string().min(1),
  start_date: z.string().datetime(),
});

// ─── Coach feedback ───
export const workoutFeedbackSchema = z.object({
  feedback: z.string().min(3).max(2000),
});

// ─── Push notifications ───
export const pushTokenSchema = z.object({
  token: z.string().startsWith("ExponentPushToken"),
  platform: z.enum(["ios", "android"]).optional(),
});

export const preferencesSchema = z.object({
  reminder_enabled: z.boolean().optional(),
  reminder_hour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().max(50).optional(),
});

export const createRoutineSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(1).max(2000),
  difficulty: difficultySchema,
  duration_minutes: z.number().int().min(5).max(180),
  exercises: z
    .array(exerciseSchema)
    .min(1)
    .max(20)
    // Integridad del JSON: el `id` de cada ejercicio es lo que workouts/log
    // usa para validar exercises_completed contra esta rutina — un duplicado
    // dejaría esa validación ambigua.
    .refine((exs) => new Set(exs.map((e) => e.id)).size === exs.length, {
      message: "exercises must not contain duplicate ids",
    }),
  preview_video_url: z.string().url().optional(),
  is_published: z.boolean().optional(),
});

export const updateRoutineSchema = createRoutineSchema.partial();

export const logWorkoutSchema = z.object({
  routine_id: z.string().min(1),
  duration_minutes: z.number().int().min(1).max(600),
  exercises_completed: z
    .array(
      z.object({
        exercise_id: z.string().min(1),
        reps_done: z.number().int().min(0),
        weight_kg: z.number().min(0).max(500).optional(),
        felt_like: z.enum(["easy", "medium", "hard"]),
      })
    )
    .min(1),
  notes: z.string().max(2000).optional(),
  // Idempotencia real: un UUID por intento de guardado, generado por el
  // cliente. Requerido — el único cliente (la app mobile de este mismo
  // monorepo) siempre lo manda; no hay clientes "viejos" que soportar todavía.
  idempotency_key: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  username: z.string().min(2).max(30).optional(),
  avatar_url: z.string().url().optional(),
});

export const createChallengeSchema = z
  .object({
    title: z.string().min(5).max(100),
    description: z.string().min(1).max(2000),
    routine_id: z.string().optional(),
    difficulty: difficultySchema,
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    max_participants: z.number().int().positive().optional(),
    xp_reward: z.number().int().min(0).max(10000),
  })
  .refine((c) => new Date(c.ends_at) > new Date(c.starts_at), {
    message: "ends_at must be after starts_at",
  });

export const checkoutSchema = z.object({
  plan: z.enum(["base", "premium"]),
});

export const analyzeVideoSchema = z.object({
  video_url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://res.cloudinary.com/"), {
      message: "video_url must be a Cloudinary URL",
    }),
  exercise_name: z.string().min(1).max(100),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
