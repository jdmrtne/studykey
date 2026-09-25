import type { QuizQuestion } from "../types/study";
import type { ChaosTwist } from "../types/quizGame";

export interface BossRoundSelection {
  sequence: QuizQuestion[];
  bossIndex: number;
}

/**
 * Picks a short 4-5 question run for Boss Round: a handful of warmup questions plus one
 * high-stakes boss question at the end. Prefers an identification question as the boss, since
 * that's the type with no multiple-choice safety net, and falls back to the last generated
 * question when there isn't one.
 */
export function selectBossRoundQuestions(all: QuizQuestion[]): BossRoundSelection {
  if (all.length === 0) return { sequence: [], bossIndex: -1 };
  if (all.length === 1) return { sequence: all, bossIndex: 0 };

  const idIndices = all.map((q, i) => (q.type === "identification" ? i : -1)).filter((i) => i >= 0);
  const bossSourceIndex = idIndices.length > 0 ? idIndices[idIndices.length - 1] : all.length - 1;
  const boss = all[bossSourceIndex];
  const warmupPool = all.filter((_, i) => i !== bossSourceIndex);
  const warmup = warmupPool.slice(0, Math.min(4, warmupPool.length));
  const sequence = [...warmup, boss];
  return { sequence, bossIndex: sequence.length - 1 };
}

const TWIST_WEIGHTS: { twist: ChaosTwist; weight: number }[] = [
  { twist: "normal", weight: 4 },
  { twist: "double_points", weight: 2 },
  { twist: "timed", weight: 2 },
  { twist: "no_hints", weight: 2 },
];

function rollTwist(): ChaosTwist {
  const total = TWIST_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * total;
  for (const w of TWIST_WEIGHTS) {
    if (roll < w.weight) return w.twist;
    roll -= w.weight;
  }
  return "normal";
}

/**
 * Assigns a random twist to every question in a Chaos run. The first question always rolls
 * "normal" so the player gets one calm beat before the twists start.
 */
export function assignChaosTwists(questions: QuizQuestion[]): ChaosTwist[] {
  return questions.map((_, i) => (i === 0 ? "normal" : rollTwist()));
}
