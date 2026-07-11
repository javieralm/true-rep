export type Role = "USER" | "TRAINER";
export type SubscriptionStatus = "FREE" | "ACTIVE" | "CANCELLED";
export type SubscriptionPlan = "MONTHLY" | "ANNUAL";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type AnalysisStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Exercise {
  id: string;
  name: string;
  reps?: string;
  duration_seconds?: number;
  technique_video_url?: string;
  description?: string;
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
  felt_like: "easy" | "medium" | "hard";
}

export interface Workout {
  id: string;
  user_id: string;
  routine_id: string;
  completed_at: string;
  duration_minutes: number;
  exercises_completed: ExerciseCompleted[];
  xp_earned: number;
  notes: string | null;
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
