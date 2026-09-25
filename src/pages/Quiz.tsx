import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SelectPills } from "../components/ui/SelectPills";
import { MultiSelectPills } from "../components/ui/MultiSelectPills";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { ModeSelect } from "../components/quiz/ModeSelect";
import { QuizPlayer } from "../components/quiz/QuizPlayer";
import { QuizResults } from "../components/quiz/QuizResults";
import { ProfileBadgeShelf } from "../components/quiz/ProfileBadgeShelf";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { useQuizProfileStore } from "../store/quizProfileStore";
import { useQuizEngine } from "../hooks/useQuizEngine";
import { generateJSON } from "../lib/aiService";
import { generateQuizPrompt } from "../prompts/generateQuiz";
import { selectBossRoundQuestions } from "../lib/quizGameUtils";
import { isQuizSet, type QuizQuestion } from "../types/study";
import type { QuizMode, QuizRunResult } from "../types/quizGame";
import { Loader2, ChevronLeft } from "lucide-react";

type QuestionType = "multiple_choice" | "true_false" | "identification";
const ALL_TYPES: QuestionType[] = ["multiple_choice", "true_false", "identification"];
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  identification: "Identification",
};

type Stage = "setup" | "mode-select" | "playing" | "results";

export function Quiz() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);
  const recordRun = useQuizProfileStore((s) => s.recordRun);

  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [types, setTypes] = useState<QuestionType[]>(["multiple_choice"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);

  const [stage, setStage] = useState<Stage>("setup");
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<QuizRunResult | null>(null);

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    setQuestions(null);
    try {
      const req = generateQuizPrompt({
        chunks: lesson.chunks,
        questionCount: count,
        difficulty,
        questionTypes: types.length ? types : ALL_TYPES,
      });
      const res = await generateJSON(config, req, isQuizSet);
      setQuestions(res.questions);
      setStage("mode-select");
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMode(m: QuizMode) {
    setMode(m);
    setRunId((r) => r + 1);
    setStage("playing");
  }

  function handleFinish(r: QuizRunResult) {
    recordRun(r);
    setResult(r);
    setStage("results");
  }

  function handlePlayAgain() {
    setRunId((r) => r + 1);
    setStage("playing");
  }

  function handleChangeMode() {
    setStage("mode-select");
  }

  // Boss Round always plays a short curated run (a handful of warmup questions plus one boss
  // question) regardless of how many questions were generated. Memoized so the sequence — and
  // Chaos Mode's twist rolls inside the engine, which key off this array's identity — stay
  // stable across re-renders instead of reshuffling on every score update.
  const playQuestions = useMemo(() => {
    if (!questions) return null;
    if (mode === "boss_round") return selectBossRoundQuestions(questions).sequence;
    return questions;
  }, [questions, mode]);

  function handleBackToLessons() {
    setStage("setup");
    setQuestions(null);
    setMode(null);
    setResult(null);
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <NotConfiguredBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
      <Header />

      {stage === "setup" && (
        <>
          <ProfileBadgeShelf lessonId={lesson?.id} />
          <Card className="p-6 flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold text-paper/80 mb-2 block">Lesson</label>
              <LessonPicker />
            </div>

            <div>
              <label className="text-sm font-semibold text-paper/80 mb-2 block">Number of questions</label>
              <SelectPills options={[5, 10, 15, 20]} value={count} onChange={setCount} />
            </div>

            <div>
              <label className="text-sm font-semibold text-paper/80 mb-2 block">Difficulty</label>
              <SelectPills options={["easy", "medium", "hard", "mixed"] as const} value={difficulty} onChange={setDifficulty} />
            </div>

            <div>
              <label className="text-sm font-semibold text-paper/80 mb-2 block">Question types</label>
              <MultiSelectPills options={ALL_TYPES} value={types} onChange={setTypes} labels={TYPE_LABELS} />
            </div>

            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!lesson || types.length === 0 || loading}
              className="w-full sm:w-auto sm:self-start"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
              Generate Quiz
            </Button>

            {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
          </Card>
        </>
      )}

      {stage === "mode-select" && questions && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={handleBackToLessons}
            className="text-sm text-paper/50 hover:text-signal flex items-center gap-1 self-start"
          >
            <ChevronLeft className="w-4 h-4" /> Start over
          </button>
          <div>
            <h2 className="font-display font-semibold text-lg">Pick a mode</h2>
            <p className="text-sm text-paper/60 mt-0.5">
              {questions.length} question{questions.length === 1 ? "" : "s"} ready on {lesson?.title ?? "this lesson"}.
            </p>
          </div>
          <ModeSelect onSelect={handleSelectMode} />
        </div>
      )}

      {stage === "playing" && playQuestions && mode && lesson && (
        <QuizGameHost
          key={runId}
          questions={playQuestions}
          mode={mode}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          lesson={lesson}
          onFinish={handleFinish}
        />
      )}

      {stage === "results" && result && (
        <QuizResults result={result} onPlayAgain={handlePlayAgain} onChangeMode={handleChangeMode} onBackToLessons={handleBackToLessons} />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Quiz</h1>
      <p className="text-paper/60 text-sm mt-1">Test what you remember — now as a real game.</p>
    </div>
  );
}

function QuizGameHost({
  questions,
  mode,
  lessonId,
  lessonTitle,
  lesson,
  onFinish,
}: {
  questions: QuizQuestion[];
  mode: QuizMode;
  lessonId: string;
  lessonTitle: string;
  lesson: ReturnType<typeof selectSelectedLesson>;
  onFinish: (r: QuizRunResult) => void;
}) {
  const engine = useQuizEngine({ questions, mode, lessonId, lessonTitle, onFinish });
  return <QuizPlayer engine={engine} mode={mode} lesson={lesson} />;
}
