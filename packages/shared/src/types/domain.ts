export type Role = "USER" | "TRAINER";
export type SubscriptionStatus = "FREE" | "ACTIVE" | "CANCELLED";
export type SubscriptionPlan = "BASE" | "PREMIUM";

/** Features por tier — única fuente de verdad para pricing web y paywall mobile */
export const PLAN_FEATURES = {
  BASE: {
    name: "Base",
    price_eur_month: 9.99,
    features: [
      "Todos los programas de fuerza",
      "Todos los niveles",
      "Calendario de entrenamiento",
      "Historial completo",
      "Progresión y XP",
      "Comunidad y retos",
      "Tests de nivel",
    ],
  },
  PREMIUM: {
    name: "Premium",
    price_eur_month: 19.99,
    features: [
      "Todo lo de Base",
      "Coach de Handstand",
      "Coach de Planche",
      "Coach de Front Lever",
      "Coach de Back Lever",
      "Coach de Human Flag",
      "Análisis de vídeos con IA",
      "Adaptación automática según progreso",
      "Recordatorios inteligentes",
      "Estadísticas avanzadas",
    ],
  },
} as const;
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type AnalysisStatus = "PENDING" | "COMPLETED" | "FAILED";

/** Ejercicio dentro de una rutina (Json en Routine.exercises) */
export interface Exercise {
  id: string;
  exercise_id?: string; // referencia a la librería si viene de ella
  name: string;
  reps?: string;
  sets?: number;
  rest_seconds?: number;
  target_weight_kg?: number;
  duration_seconds?: number;
  technique_video_url?: string;
  description?: string;
}

/** Ejercicio de la librería del trainer */
export interface LibraryExercise {
  id: string;
  trainer_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  created_at: string;
}

export type ProgramItemType = "ROUTINE" | "MESSAGE" | "VIDEO" | "NOTE" | "SESSION";

export interface ProgramTaskData {
  title?: string;
  body?: string;
  url?: string;
  mode?: "presencial" | "online";
  location?: string;
  time?: string;
}

export interface ProgramItem {
  id?: string;
  week: number;
  day: number; // 1-7 (lunes-domingo)
  order: number;
  type: ProgramItemType;
  routine_id?: string | null; // solo tareas ROUTINE
  routine?: Pick<Routine, "id" | "title" | "difficulty" | "duration_minutes"> | null;
  data?: ProgramTaskData | null;
}

export interface Program {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  items?: ProgramItem[];
  created_at: string;
}

export interface ProgramAssignment {
  id: string;
  program_id: string;
  user_id: string;
  start_date: string;
  is_active: boolean;
}

/** Respuesta de /api/me/stats */
export interface MeStats {
  totals: { workouts: number; reps: number; xp: number; streak: number };
  weekly: Array<{ week_start: string; workouts: number; reps: number }>;
  /** Solo Premium (estadísticas avanzadas); null en Base */
  weights: Array<{
    exercise_id: string;
    exercise_name: string;
    entries: Array<{ date: string; weight_kg: number; reps_done: number }>;
  }> | null;
}

/** Una tarea del día en el schedule del cliente (rutina, mensaje, vídeo, nota o sesión) */
export interface ScheduleTask {
  type: ProgramItemType;
  order: number;
  routine?: (Pick<Routine, "id" | "title" | "difficulty" | "duration_minutes"> & { completed: boolean }) | null;
  data?: ProgramTaskData | null;
}

/** Respuesta de /api/me/schedule para el cliente Premium */
export interface DaySchedule {
  program_id: string;
  program_name: string;
  week: number; // semana actual del programa
  day: number; // día actual 1-7
  tasks: ScheduleTask[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  role: Role;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan | null;
  subscription_expires_at: string | null;
  xp: number;
  streak: number;
  reminder_enabled?: boolean;
  reminder_hour?: number;
  timezone?: string;
}

export interface Routine {
  id: string;
  trainer_id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  duration_minutes: number;
  exercises: Exercise[];
  preview_video_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface ExerciseCompleted {
  exercise_id: string;
  reps_done: number;
  weight_kg?: number;
  felt_like: "easy" | "medium" | "hard";
}

export interface Workout {
  id: string;
  user_id: string;
  routine_id: string;
  routine?: Pick<Routine, "id" | "title" | "difficulty">;
  completed_at: string;
  duration_minutes: number;
  exercises_completed: ExerciseCompleted[];
  xp_earned: number;
  notes: string | null;
  trainer_feedback?: string | null;
  feedback_at?: string | null;
}

/** Payload real de POST /api/workouts/log — distinto de Workout: agrega
 * user (xp/streak actualizados), logros desbloqueados, y si fue un
 * duplicado deduplicado en vez de un workout nuevo. */
export interface LogWorkoutResponse extends Workout {
  user: { xp: number; streak: number };
  unlocked_achievements: string[];
  deduped: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  unlocked_at?: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  routine_id: string | null;
  difficulty: Difficulty;
  starts_at: string;
  ends_at: string;
  max_participants: number | null;
  xp_reward: number;
  participant_count?: number;
}

export interface LeaderboardRow {
  rank: number | null;
  user_id: string;
  username: string;
  avatar_url: string | null;
  xp?: number;
  completed_at: string | null;
}

export interface VideoFeedback {
  id: string;
  exercise_name: string;
  video_url: string;
  analysis_status: AnalysisStatus;
  feedback_text: string | null;
  created_at: string;
}

/** Regla no negociable #2: forma de respuesta API consistente */
export interface ApiResponse<T> {
  data: T | null;
  status: "success" | "error";
  message?: string;
  timestamp: string;
}
