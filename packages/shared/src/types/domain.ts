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
export type AnalysisStatus = "PENDING_TRAINER_REVIEW" | "PENDING" | "COMPLETED" | "FAILED";

/** Ejercicio dentro de una rutina (Json en Routine.exercises) */
/** Cómo se cuenta un ejercicio: por repeticiones o, en los posturales e
 * isométricos (L-sit, plancha, dead hang), por segundos aguantados. */
export type ExerciseMeasure = "reps" | "seconds";

export interface Exercise {
  id: string;
  exercise_id?: string; // referencia a la librería si viene de ella
  name: string;
  /** Sin definir = solo repeticiones. "seconds" = admite registrar segundos
   *  (isométricos como el L-sit): el cliente elige al entrenar, reps por defecto. */
  measure?: ExerciseMeasure;
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
  measure: ExerciseMeasure;
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

/** Respuesta de /api/me/plan: la semana actual del programa que el entrenador
 * ha asignado al cliente, quién es su entrenador y lo que le ha enviado. */
export interface ClientPlan {
  program_id: string;
  program_name: string;
  /** false si el programa empieza más adelante: `days` es entonces la semana 1. */
  started: boolean;
  week: number;
  /** Día actual 1-7; 0 si aún no ha empezado. */
  day: number;
  trainer: { id: string; username: string; avatar_url: string | null };
  days: { day: number; tasks: ScheduleTask[] }[];
  /** Mensajes, vídeos y notas ya publicados (hasta hoy), el más reciente primero. */
  messages: { week: number; day: number; type: ProgramItemType; data: ProgramTaskData | null }[];
}

export type ClientStatus = "INVITED" | "ACTIVE" | "PAUSED" | "ENDED";
export type BillingMode = "STRIPE" | "CASH";

/** Si el usuario puede usar la app como cliente y, si no, por qué. */
export type AccessState = "active" | "no_invitation" | "paused" | "payment_required" | "ended";

/** Respuesta de /api/me/access */
export interface MyAccess {
  state: AccessState;
  /** Los entrenadores no son clientes de nadie: siempre entran. */
  is_trainer: boolean;
  trainer: { username: string; avatar_url: string | null } | null;
  billing: BillingMode | null;
  paid_until: string | null;
}

/** Fila de /api/clients (dashboard del entrenador) */
export interface TrainerClientRow {
  id: string;
  email: string;
  status: ClientStatus;
  billing: BillingMode;
  paid_until: string | null;
  invited_at: string;
  accepted_at: string | null;
  /** null mientras el invitado no ha entrado en la app */
  user: { id: string; username: string; email: string; avatar_url: string | null; streak: number } | null;
  program: {
    id: string;
    name: string;
    current_week: number;
    completed_workouts: number;
    total_items: number;
    completion_percent: number;
  } | null;
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
  /** Solo presente cuando GET /routines/[id] se pide autenticado (auto-escalado) */
  weight_suggestions?: WeightSuggestion[];
}

/** Auto-escalado: si la última vez que se registró peso en este ejercicio se
 * sintió "easy", sugiere +1kg. El cliente decide si la usa. */
export interface WeightSuggestion {
  exercise_id: string;
  last_weight_kg: number;
  last_felt_like: "easy" | "medium" | "hard";
  suggested_weight_kg: number;
}

/** Una serie suelta dentro de un ejercicio. */
export interface CompletedSet {
  /** En ejercicios por segundos va a 0 y lo hecho está en `seconds`. */
  reps: number;
  seconds?: number;
  weight_kg?: number;
}

export interface ExerciseCompleted {
  exercise_id: string;
  /** Suma de las reps de todas las series. */
  reps_done: number;
  /** La carga de la serie más pesada. Es la que alimenta el auto-escalado y la
   *  progresión de pesos: lo que interesa es la serie tope, no el promedio. */
  weight_kg?: number;
  felt_like: "easy" | "medium" | "hard";
  /** Observación del cliente sobre el ejercicio ("molestia en el hombro en la
   *  3ª serie"). Se le enseña en la siguiente sesión y la ve su entrenador. */
  note?: string;
  /** Detalle por serie. Opcional a propósito: los workouts registrados antes de
   *  que existiera no lo tienen, y `reps_done`/`weight_kg` siguen siendo la
   *  fuente de verdad para stats, export y progresión. Quien quiera el desglose
   *  lo lee de aquí cuando está. */
  sets?: CompletedSet[];
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

/** GET /api/video-feedback/pending-review — cola de aprobación manual del trainer */
export interface PendingReviewFeedback extends VideoFeedback {
  user: { id: string; username: string; avatar_url: string | null };
}

/** Regla no negociable #2: forma de respuesta API consistente */
export interface ApiResponse<T> {
  data: T | null;
  status: "success" | "error";
  message?: string;
  timestamp: string;
}

export type PriceInterval = "MONTH" | "QUARTER" | "YEAR";

/** Estado de la cuenta de Stripe del entrenador. */
export type ConnectState = "not_connected" | "onboarding" | "ready";

/** Respuesta de GET /api/stripe/connect/status */
export interface ConnectStatus {
  state: ConnectState;
  /** Enlace a su panel de Stripe (panel completo) cuando ya tiene cuenta. */
  dashboard_url: string | null;
}

export interface TrainerPriceRow {
  interval: PriceInterval;
  amount: number;
  currency: string;
}

/** Respuesta de GET /api/me/billing (cliente que paga por Stripe). */
export interface MyBilling {
  /** El entrenador ya puede cobrar con Stripe y tiene precios puestos. */
  can_subscribe: boolean;
  prices: TrainerPriceRow[];
  subscription: {
    /** Estado tal cual lo da Stripe: active, past_due, canceled… */
    status: string;
    current_period_end: string | null;
  } | null;
}

export interface CommissionTier {
  /** Hasta cuántos clientes activos aplica; null = sin límite. */
  max: number | null;
  pct: number;
}

/** Respuesta de GET/PUT /api/admin/settings */
export interface PlatformSettingsDto {
  commission_tiers: CommissionTier[];
  cash_fee_amount: number;
  cash_fee_currency: string;
}
