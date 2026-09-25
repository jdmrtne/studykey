import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizQuestion } from "../types/study";
import { assignChaosTwists } from "../lib/quizGameUtils";
import {
  EMPTY_POWER_UPS,
  powerUpsForMode,
  type AchievementId,
  type AnswerRecord,
  type ChaosTwist,
  type PowerUpCounts,
  type PowerUpKind,
  type QuizMode,
  type QuizRunResult,
} from "../types/quizGame";

const BASE_TIME_PER_QUESTION_MS = 15000;
const MIN_TIME_PER_QUESTION_MS = 6000;
const TIME_BONUS_ON_FAST_CORRECT_MS = 3000;
const SURVIVAL_LIVES = 3;
const CHAOS_TIMED_QUESTION_MS = 10000;
const CHAOS_BANNER_MS = 1200;
const BOSS_SCORE_MULTIPLIER = 1.75;
const TICK_MS = 100;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isCorrectAnswer(q: QuizQuestion, picked: string): boolean {
  return normalize(picked) === normalize(q.answer);
}

function basePointsFor(q: QuizQuestion): number {
  return q.type === "identification" ? 150 : 100;
}

/** The per-question "soft" time budget used for Time Attack's shrinking pressure and the Speed Demon bonus math. */
function perQuestionBudgetMs(index: number): number {
  return Math.max(MIN_TIME_PER_QUESTION_MS, BASE_TIME_PER_QUESTION_MS - index * 700);
}

interface EngineOptions {
  questions: QuizQuestion[];
  mode: QuizMode;
  lessonId: string;
  lessonTitle: string;
  onFinish: (result: QuizRunResult) => void;
}

export interface QuizEngineState {
  index: number;
  total: number;
  question: QuizQuestion;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number | null;
  timeLeftMs: number | null;
  timeBudgetMs: number | null;
  questionBudgetMs: number | null;
  questionTimeLeftMs: number | null;
  powerUps: PowerUpCounts;
  availablePowerUps: PowerUpKind[];
  skipUsed: boolean;
  revealed: boolean;
  lastCorrect: boolean | null;
  picked: string | null;
  hiddenOptions: string[];
  frozen: boolean;
  finished: boolean;
  justEarnedPowerUp: PowerUpKind | null;
  isBossQuestion: boolean;
  showBossIntro: boolean;
  currentTwist: ChaosTwist | null;
  showTwistBanner: boolean;
  submitAnswer: (picked: string) => void;
  next: () => void;
  useFiftyFifty: () => void;
  useFreeze: () => void;
  useSkip: () => void;
  dismissBossIntro: () => void;
}

export function useQuizEngine({ questions, mode, lessonId, lessonTitle, onFinish }: EngineOptions): QuizEngineState {
  const hasRunTimer = mode === "time_attack";
  const isSurvival = mode === "survival";
  const isStreakRush = mode === "streak_rush";
  const isBossRound = mode === "boss_round";
  const isChaos = mode === "chaos";

  const initialTimeBudget = useMemo(
    () => (hasRunTimer ? questions.reduce((sum, _q, i) => sum + perQuestionBudgetMs(i), 0) : null),
    [hasRunTimer, questions]
  );

  const twists = useMemo(() => (isChaos ? assignChaosTwists(questions) : []), [isChaos, questions]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState<number | null>(isSurvival ? SURVIVAL_LIVES : null);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(initialTimeBudget);
  const [questionTimeLeftMs, setQuestionTimeLeftMs] = useState<number | null>(null);
  const [powerUps, setPowerUps] = useState<PowerUpCounts>(EMPTY_POWER_UPS);
  const [skipUsed, setSkipUsed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [justEarnedPowerUp, setJustEarnedPowerUp] = useState<PowerUpKind | null>(null);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [showTwistBanner, setShowTwistBanner] = useState(false);

  const answersRef = useRef<AnswerRecord[]>([]);
  const questionStartRef = useRef<number>(Date.now());
  const powerUpGrantCountRef = useRef(0);
  const finishedRef = useRef(false);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const minLivesRef = useRef<number | null>(isSurvival ? SURVIVAL_LIVES : null);
  const bossIntroSeenRef = useRef(false);

  const availablePowerUps = useMemo(() => powerUpsForMode(mode), [mode]);
  const question = questions[Math.min(index, questions.length - 1)];
  const questionBudgetMs = hasRunTimer ? perQuestionBudgetMs(index) : null;
  const isBossQuestion = isBossRound && index === questions.length - 1;
  const currentTwist: ChaosTwist | null = isChaos ? (twists[index] ?? "normal") : null;

  const finish = useCallback(
    (completedAllQuestions: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);

      const finalScore = scoreRef.current;
      const finalBestStreak = bestStreakRef.current;
      const correctCount = answersRef.current.filter((a) => a.correct).length;
      const allCorrect = completedAllQuestions && answersRef.current.length === questions.length && correctCount === questions.length;

      const newAchievements: AchievementId[] = [];
      if (allCorrect) newAchievements.push("perfect_run");
      if (isSurvival && completedAllQuestions && minLivesRef.current === 1) newAchievements.push("comeback");
      if (
        mode === "time_attack" &&
        completedAllQuestions &&
        timeLeftMs !== null &&
        initialTimeBudget !== null &&
        timeLeftMs >= initialTimeBudget * 0.3
      ) {
        newAchievements.push("speed_demon");
      }
      if (questions.length >= 20 && completedAllQuestions) newAchievements.push("marathoner");
      if (isBossRound && completedAllQuestions) {
        const bossAnswer = answersRef.current[answersRef.current.length - 1];
        if (bossAnswer && bossAnswer.correct) newAchievements.push("boss_slayer");
      }

      const xpEarned = Math.round(finalScore / 8) + correctCount * 5 + newAchievements.length * 50;

      onFinish({
        mode,
        lessonId,
        lessonTitle,
        questions,
        answers: answersRef.current,
        correctCount,
        score: finalScore,
        xpEarned,
        bestStreakThisRun: finalBestStreak,
        livesLeft: lives,
        timeLeftMs,
        timeBudgetMs: initialTimeBudget,
        completedAllQuestions,
        newAchievements,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, lessonId, lessonTitle, questions, lives, timeLeftMs, initialTimeBudget, isSurvival, isBossRound]
  );

  // Whole-run countdown for Time Attack. Pauses while a question's result is being shown
  // (revealed) or a Freeze power-up is active, so the clock only runs while the player is
  // actually reading and deciding.
  useEffect(() => {
    if (!hasRunTimer || finished || revealed || frozen) return;
    const interval = setInterval(() => {
      setTimeLeftMs((t) => {
        if (t === null) return t;
        const next = t - TICK_MS;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [hasRunTimer, finished, revealed, frozen]);

  // Time's up ends the run immediately, the same way Survival ends on 0 lives.
  useEffect(() => {
    if (hasRunTimer && timeLeftMs === 0 && !finished) {
      finish(false);
    }
  }, [hasRunTimer, timeLeftMs, finished, finish]);

  // Boss Round's dramatic intro: shown once, the moment the run reaches the boss question,
  // whether that's after a warmup or (in a one-question run) immediately.
  useEffect(() => {
    if (isBossRound && index === questions.length - 1 && !bossIntroSeenRef.current) {
      setShowBossIntro(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBossRound, index, questions.length]);

  // Chaos Mode's quick twist-announcement banner, shown for a beat at the start of every question.
  useEffect(() => {
    if (!isChaos) return;
    setShowTwistBanner(true);
    const t = setTimeout(() => setShowTwistBanner(false), CHAOS_BANNER_MS);
    return () => clearTimeout(t);
  }, [isChaos, index]);

  // Chaos Mode's per-question hard timer, only active on questions that roll the "timed" twist.
  useEffect(() => {
    if (isChaos && currentTwist === "timed") {
      setQuestionTimeLeftMs(CHAOS_TIMED_QUESTION_MS);
    } else {
      setQuestionTimeLeftMs(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChaos, index]);

  useEffect(() => {
    if (!isChaos || currentTwist !== "timed" || finished || revealed || frozen || showTwistBanner) return;
    const interval = setInterval(() => {
      setQuestionTimeLeftMs((t) => {
        if (t === null) return t;
        const next = t - TICK_MS;
        return next <= 0 ? 0 : next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isChaos, currentTwist, finished, revealed, frozen, showTwistBanner]);

  function maybeGrantPowerUp(newStreak: number) {
    if (newStreak > 0 && newStreak % 3 === 0) {
      const list = availablePowerUps;
      const kind = list[powerUpGrantCountRef.current % list.length];
      powerUpGrantCountRef.current += 1;
      setPowerUps((p) => ({ ...p, [kind]: p[kind] + 1 }));
      setJustEarnedPowerUp(kind);
    } else {
      setJustEarnedPowerUp(null);
    }
  }

  const submitAnswer = useCallback(
    (value: string) => {
      if (revealed || finished) return;
      const q = question;
      const correct = isCorrectAnswer(q, value);
      const newStreak = correct ? streak + 1 : 0;

      setPicked(value || null);
      setLastCorrect(correct);
      setRevealed(true);
      setStreak(newStreak);
      if (newStreak > bestStreakRef.current) {
        bestStreakRef.current = newStreak;
        setBestStreak(newStreak);
      }

      const base = basePointsFor(q);
      const streakBonus = correct ? Math.min(newStreak - 1, 5) * 10 : 0;
      const streakMultiplier = isStreakRush ? Math.min(1 + Math.floor((newStreak - 1) / 3) * 0.5, 4) : 1;
      const twistMultiplier = isChaos && currentTwist === "double_points" ? 2 : 1;
      const bossMultiplier = isBossQuestion ? BOSS_SCORE_MULTIPLIER : 1;
      const points = correct ? Math.round((base + streakBonus) * streakMultiplier * twistMultiplier * bossMultiplier) : 0;
      if (points) {
        scoreRef.current += points;
        setScore(scoreRef.current);
      }

      answersRef.current = [...answersRef.current, { questionId: q.id, correct, skipped: false, picked: value || null }];

      if (correct) {
        maybeGrantPowerUp(newStreak);
      } else {
        setJustEarnedPowerUp(null);
        if (isSurvival) {
          setLives((l) => {
            const next = (l ?? SURVIVAL_LIVES) - 1;
            if (minLivesRef.current === null || next < minLivesRef.current) minLivesRef.current = next;
            return next;
          });
        }
      }

      if (hasRunTimer && correct) {
        const elapsed = Date.now() - questionStartRef.current;
        const budget = perQuestionBudgetMs(index);
        if (elapsed <= budget) {
          setTimeLeftMs((t) => (t === null ? t : t + TIME_BONUS_ON_FAST_CORRECT_MS));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revealed, finished, question, streak, isStreakRush, isSurvival, hasRunTimer, isChaos, currentTwist, isBossQuestion, index, availablePowerUps]
  );

  // A Chaos "timed" question that runs out the clock counts as a miss, same as answering wrong.
  useEffect(() => {
    if (isChaos && currentTwist === "timed" && questionTimeLeftMs === 0 && !revealed && !finished) {
      submitAnswer("");
    }
  }, [isChaos, currentTwist, questionTimeLeftMs, revealed, finished, submitAnswer]);

  const next = useCallback(() => {
    if (finished) return;
    // Survival ends the instant lives hit zero, even if the player answered the final question.
    if (isSurvival && lives !== null && lives <= 0) {
      finish(false);
      return;
    }
    if (index + 1 >= questions.length) {
      finish(true);
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setLastCorrect(null);
    setPicked(null);
    setHiddenOptions([]);
    setFrozen(false);
    setJustEarnedPowerUp(null);
    questionStartRef.current = Date.now();
  }, [finished, isSurvival, lives, index, questions.length, finish]);

  const useFiftyFifty = useCallback(() => {
    if (revealed || finished) return;
    if (isChaos && currentTwist === "no_hints") return;
    if (powerUps.fifty_fifty <= 0) return;
    if (question.type !== "multiple_choice" || !question.options || question.options.length <= 2) return;
    if (hiddenOptions.length > 0) return;
    const wrongOptions = question.options.filter((o) => normalize(o) !== normalize(question.answer));
    const toHide = [...wrongOptions].sort(() => Math.random() - 0.5).slice(0, Math.max(0, question.options.length - 2));
    setHiddenOptions(toHide);
    setPowerUps((p) => ({ ...p, fifty_fifty: p.fifty_fifty - 1 }));
  }, [revealed, finished, isChaos, currentTwist, powerUps.fifty_fifty, question, hiddenOptions.length]);

  const useFreeze = useCallback(() => {
    if (revealed || finished) return;
    if (isChaos && currentTwist === "no_hints") return;
    const canFreeze = hasRunTimer || (isChaos && currentTwist === "timed");
    if (!canFreeze || frozen) return;
    if (powerUps.freeze <= 0) return;
    setFrozen(true);
    setPowerUps((p) => ({ ...p, freeze: p.freeze - 1 }));
  }, [revealed, finished, isChaos, currentTwist, hasRunTimer, frozen, powerUps.freeze]);

  const useSkip = useCallback(() => {
    if (revealed || finished) return;
    if (isChaos && currentTwist === "no_hints") return;
    if (skipUsed || powerUps.skip <= 0) return;
    setSkipUsed(true);
    setPowerUps((p) => ({ ...p, skip: p.skip - 1 }));
    answersRef.current = [...answersRef.current, { questionId: question.id, correct: false, skipped: true, picked: null }];
    if (index + 1 >= questions.length) {
      finish(true);
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setLastCorrect(null);
    setPicked(null);
    setHiddenOptions([]);
    setFrozen(false);
    setJustEarnedPowerUp(null);
    questionStartRef.current = Date.now();
  }, [revealed, finished, isChaos, currentTwist, skipUsed, powerUps.skip, question, index, questions.length, finish]);

  const dismissBossIntro = useCallback(() => {
    bossIntroSeenRef.current = true;
    setShowBossIntro(false);
    questionStartRef.current = Date.now();
  }, []);

  return {
    index,
    total: questions.length,
    question,
    score,
    streak,
    bestStreak,
    lives,
    timeLeftMs,
    timeBudgetMs: initialTimeBudget,
    questionBudgetMs,
    questionTimeLeftMs,
    powerUps,
    availablePowerUps,
    skipUsed,
    revealed,
    lastCorrect,
    picked,
    hiddenOptions,
    frozen,
    finished,
    justEarnedPowerUp,
    isBossQuestion,
    showBossIntro,
    currentTwist,
    showTwistBanner,
    submitAnswer,
    next,
    useFiftyFifty,
    useFreeze,
    useSkip,
    dismissBossIntro,
  };
}
