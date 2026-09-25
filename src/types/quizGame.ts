import type { QuizQuestion } from "./study";

export type QuizMode = "classic" | "time_attack" | "survival" | "streak_rush" | "boss_round" | "chaos";

export interface QuizModeDef {
  id: QuizMode;
  label: string;
  tagline: string;
  comingSoon?: boolean;
}

export const QUIZ_MODES: QuizModeDef[] = [
  { id: "classic", label: "Classic", tagline: "One question at a time. No timer, no pressure." },
  { id: "time_attack", label: "Time Attack", tagline: "Beat the clock. Fast answers bank bonus time." },
  { id: "survival", label: "Survival", tagline: "3 lives. One miss too many and it's over." },
  { id: "streak_rush", label: "Streak Rush", tagline: "Chain correct answers to build a big multiplier." },
  { id: "boss_round", label: "Boss Round", tagline: "A short run building to one high-stakes boss question." },
  { id: "chaos", label: "Chaos Mode", tagline: "A different twist every question. Anything goes." },
];

export type PowerUpKind = "fifty_fifty" | "freeze" | "skip";

export type PowerUpCounts = Record<PowerUpKind, number>;

export const EMPTY_POWER_UPS: PowerUpCounts = { fifty_fifty: 0, freeze: 0, skip: 0 };

/** Which power-ups are meaningful in a given mode — Freeze only matters where there's a clock to freeze. */
export function powerUpsForMode(mode: QuizMode): PowerUpKind[] {
  if (mode === "time_attack" || mode === "chaos") return ["fifty_fifty", "freeze", "skip"];
  return ["fifty_fifty", "skip"];
}

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  skipped: boolean;
  picked: string | null;
}

/** The per-question twist Chaos Mode can roll. "normal" means no twist this question. */
export type ChaosTwist = "normal" | "double_points" | "timed" | "no_hints";

export const CHAOS_TWIST_META: Record<ChaosTwist, { banner: string }> = {
  normal: { banner: "🎲 Normal question" },
  double_points: { banner: "⚡ Double points!" },
  timed: { banner: "⏱️ 10 seconds!" },
  no_hints: { banner: "🎯 No hints this one" },
};

export type AchievementId = "perfect_run" | "comeback" | "speed_demon" | "marathoner" | "boss_slayer";

export interface AchievementDef {
  id: AchievementId;
  label: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "perfect_run", label: "Perfect Run", description: "Finish a quiz with every question correct." },
  { id: "comeback", label: "Comeback", description: "Survive down to your last life and still finish." },
  { id: "speed_demon", label: "Speed Demon", description: "Clear a Time Attack run with time to spare." },
  { id: "marathoner", label: "Marathoner", description: "Finish a run of 20 or more questions." },
  { id: "boss_slayer", label: "Boss Slayer", description: "Beat the boss question in a Boss Round." },
];

export interface QuizRunResult {
  mode: QuizMode;
  lessonId: string;
  lessonTitle: string;
  questions: QuizQuestion[];
  answers: AnswerRecord[];
  correctCount: number;
  score: number;
  xpEarned: number;
  bestStreakThisRun: number;
  livesLeft: number | null;
  timeLeftMs: number | null;
  timeBudgetMs: number | null;
  /** False when a Survival run ended early because lives hit 0, or Time Attack/Chaos ran out the clock. */
  completedAllQuestions: boolean;
  newAchievements: AchievementId[];
}
