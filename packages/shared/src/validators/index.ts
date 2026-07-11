import { z } from "zod";

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  reps: z.string().optional(),
  duration_seconds: z.number().int().positive().optional(),
  technique_video_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

export const createRoutineSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(1).max(2000),
  difficulty: difficultySchema,
  duration_minutes: z.number().int().min(5).max(180),
  exercises: z.array(exerciseSchema).min(1).max(20),
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
        felt_like: z.enum(["easy", "medium", "hard"]),
      })
    )
    .min(1),
  notes: z.string().max(2000).optional(),
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
  plan: z.enum(["monthly", "annual"]),
});

export const analyzeVideoSchema = z.object({
  video_url: z.string().url(),
  exercise_name: z.string().min(1).max(100),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
