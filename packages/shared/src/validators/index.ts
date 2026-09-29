import { z } from "zod";

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const exerciseMeasureSchema = z.enum(["reps", "seconds"]);

export const exerciseSchema = z.object({
  id: z.string().min(1),
  exercise_id: z.string().optional(), // referencia a la librería si viene de ella
  name: z.string().min(1).max(100),
  measure: exerciseMeasureSchema.optional(),
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
  measure: exerciseMeasureSchema.optional(),
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
        note: z.string().trim().max(500).optional(),
        // Desglose por serie. Opcional: los clientes que no lo mandan siguen
        // siendo válidos, y reps_done/weight_kg se mantienen como agregados.
        // El tope de 30 es para que una app rota no meta un array enorme en
        // la columna JSON.
        sets: z
          .array(
            z.object({
              reps: z.number().int().min(0).max(1000),
              // Ejercicios por segundos (L-sit, plancha). Tope: una hora.
              seconds: z.number().int().min(0).max(3600).optional(),
              weight_kg: z.number().min(0).max(500).optional(),
            })
          )
          .max(30)
          .optional(),
      })
    )
    .min(1),
  notes: z.string().max(2000).optional(),
  // Idempotencia real: un UUID por intento de guardado, generado por el
  // cliente. Requerido — el único cliente (la app mobile de este mismo
  // monorepo) siempre lo manda; no hay clientes "viejos" que soportar todavía.
  idempotency_key: z.string().uuid(),
});

// ─── Clientes del entrenador ───
export const billingModeSchema = z.enum(["STRIPE", "CASH"]);

/** Fecha "pagado hasta" como YYYY-MM-DD (lo que da un <input type="date">). */
const paidUntilSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)");

export const inviteClientSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  billing: billingModeSchema,
  paid_until: paidUntilSchema.optional(),
});

export const updateClientSchema = z
  .object({
    // INVITED no se puede elegir: es el estado de partida, lo pone el sistema.
    status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
    billing: billingModeSchema.optional(),
    paid_until: paidUntilSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

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

// ─── Cobros del entrenador (Stripe Connect) ───
/** Monedas que ofrece el selector. Todas con 2 decimales. */
export const TRAINER_CURRENCIES = ["eur", "dkk", "sek", "nok", "gbp", "usd"] as const;
export const priceIntervalSchema = z.enum(["MONTH", "QUARTER", "YEAR"]);

/** Importe en unidades mínimas. 300 = 3,00: por encima del mínimo de cobro de
 * Stripe en todas las monedas del selector (el más alto, SEK/NOK, es 3,00). */
const priceAmountSchema = z.number().int().min(300, "Importe mínimo: 3,00").max(1_000_000);

/** PUT /api/trainer/prices: hasta un precio por periodicidad, todos en la misma
 * moneda. null o ausente = esa periodicidad no se ofrece. */
export const trainerPricesSchema = z
  .object({
    currency: z.enum(TRAINER_CURRENCIES),
    prices: z.object({
      MONTH: priceAmountSchema.nullable().optional(),
      QUARTER: priceAmountSchema.nullable().optional(),
      YEAR: priceAmountSchema.nullable().optional(),
    }),
  })
  .refine((v) => Object.values(v.prices).some((a) => a != null), {
    message: "Pon al menos un precio",
    path: ["prices"],
  });

/** Países que ofrece el alta del entrenador (ISO 3166-1 alfa-2). Con direct
 * charges cada entrenador cobra como comercio en su país. */
export const TRAINER_COUNTRIES = ["ES", "DK", "SE", "NO", "GB", "IE", "PT", "FR", "DE", "IT", "NL", "BE", "AT", "FI", "US"] as const;

export const connectOnboardingSchema = z.object({
  // Solo cuenta al crear la cuenta; al continuar un alta ya empezada se ignora.
  country: z.enum(TRAINER_COUNTRIES).optional(),
});

/** POST /api/me/billing/checkout: el cliente elige una periodicidad de su entrenador. */
export const clientCheckoutSchema = z.object({ interval: priceIntervalSchema });

// ─── Ajustes de cobro de TrueRep (/admin) ───
/** Porcentaje de comisión: 0–100 con hasta 2 decimales (columna Decimal(5,2)). */
const percentSchema = z
  .number()
  .min(0)
  .max(100)
  .refine((n) => Math.round(n * 100) === n * 100, { message: "Máximo 2 decimales" });

/** Tramos de comisión: "hasta max clientes activos, pct %". Límites en orden
 * creciente y el último sin límite, para que todo entrenador caiga en uno. */
export const commissionTiersSchema = z
  .array(z.object({ max: z.number().int().positive().nullable(), pct: percentSchema }))
  .min(1)
  .max(10)
  .refine((tiers) => tiers.at(-1)?.max === null && tiers.slice(0, -1).every((t) => t.max !== null), {
    message: "Solo el último tramo va sin límite",
  })
  .refine((tiers) => tiers.every((t, i) => i === 0 || t.max === null || t.max > (tiers[i - 1].max ?? Infinity)), {
    message: "Los límites deben ir de menor a mayor",
  });

export const platformSettingsSchema = z.object({
  commission_tiers: commissionTiersSchema,
  /** Cuota mensual por cliente en efectivo, en céntimos. 0 = no se cobra. */
  cash_fee_amount: z.number().int().min(0).max(100_000),
});

/** Porcentaje propio de un entrenador (ofertas). null = vuelve a los tramos. */
export const commissionOverrideSchema = z.object({ commission_percent_override: percentSchema.nullable() });
