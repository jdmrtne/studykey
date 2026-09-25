import { create } from "zustand";
import { ACHIEVEMENTS, type AchievementId, type QuizRunResult } from "../types/quizGame";

const STORAGE_KEY = "studykey-quiz-profile";

export interface RankTier {
  title: string;
  minXp: number;
}

/** XP thresholds for each rank title. Index into this array is the "rank level". */
export const RANKS: RankTier[] = [
  { title: "Rookie", minXp: 0 },
  { title: "Scholar", minXp: 400 },
  { title: "Ace", minXp: 1200 },
  { title: "Master", minXp: 3000 },
  { title: "Legend", minXp: 6000 },
];

export function rankForXp(xp: number): { tier: RankTier; level: number; next: RankTier | null; progress: number } {
  let level = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) level = i;
  }
  const tier = RANKS[level];
  const next = RANKS[level + 1] ?? null;
  const progress = next ? (xp - tier.minXp) / (next.minXp - tier.minXp) : 1;
  return { tier, level, next, progress: Math.min(Math.max(progress, 0), 1) };
}

export interface LessonBest {
  lessonId: string;
  lessonTitle: string;
  bestScore: number;
  bestStreak: number;
}

interface QuizProfileData {
  xp: number;
  totalRuns: number;
  bestByLesson: Record<string, LessonBest>;
  achievements: AchievementId[];
}

function defaultData(): QuizProfileData {
  return { xp: 0, totalRuns: 0, bestByLesson: {}, achievements: [] };
}

function load(): QuizProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<QuizProfileData>;
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      totalRuns: typeof parsed.totalRuns === "number" ? parsed.totalRuns : 0,
      bestByLesson: parsed.bestByLesson && typeof parsed.bestByLesson === "object" ? parsed.bestByLesson : {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((a) => ACHIEVEMENTS.some((d) => d.id === a)) : [],
    };
  } catch {
    return defaultData();
  }
}

function persist(data: QuizProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort, same posture as the other stores in this app
  }
}

interface QuizProfileState extends QuizProfileData {
  /** Applies a finished run's results to the profile, returning any achievements newly unlocked. */
  recordRun: (result: QuizRunResult) => AchievementId[];
  resetProfile: () => void;
}

export const useQuizProfileStore = create<QuizProfileState>((set, get) => ({
  ...load(),

  recordRun: (result) => {
    const s = get();
    const prevBest = s.bestByLesson[result.lessonId];
    const bestScore = Math.max(prevBest?.bestScore ?? 0, result.score);
    const bestStreak = Math.max(prevBest?.bestStreak ?? 0, result.bestStreakThisRun);
    const newlyUnlocked = result.newAchievements.filter((a) => !s.achievements.includes(a));

    const next: QuizProfileData = {
      xp: s.xp + result.xpEarned,
      totalRuns: s.totalRuns + 1,
      bestByLesson: {
        ...s.bestByLesson,
        [result.lessonId]: { lessonId: result.lessonId, lessonTitle: result.lessonTitle, bestScore, bestStreak },
      },
      achievements: newlyUnlocked.length ? [...s.achievements, ...newlyUnlocked] : s.achievements,
    };
    set(next);
    persist(next);
    return newlyUnlocked;
  },

  resetProfile: () => {
    const fresh = defaultData();
    set(fresh);
    persist(fresh);
  },
}));
