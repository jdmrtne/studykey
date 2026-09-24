import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SelectPills } from "../components/ui/SelectPills";
import { MultiSelectPills } from "../components/ui/MultiSelectPills";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { generateJSON } from "../lib/aiService";
import { generateQuizPrompt } from "../prompts/generateQuiz";
import { isQuizSet, type QuizQuestion } from "../types/study";
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import clsx from "clsx";

type QuestionType = "multiple_choice" | "true_false" | "identification";
const ALL_TYPES: QuestionType[] = ["multiple_choice", "true_false", "identification"];
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  identification: "Identification",
};

export function Quiz() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);

  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [types, setTypes] = useState<QuestionType[]>(["multiple_choice"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealedSource, setRevealedSource] = useState<string | null>(null);

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    setQuestions(null);
    setAnswers({});
    try {
      const req = generateQuizPrompt({
        chunks: lesson.chunks,
        questionCount: count,
        difficulty,
        questionTypes: types.length ? types : ALL_TYPES,
      });
      const result = await generateJSON(config, req, isQuizSet);
      setQuestions(result.questions);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-display font-bold">Quiz</h1>
        <NotConfiguredBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
      <h1 className="text-2xl font-display font-bold">Quiz</h1>

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
          <SelectPills
            options={["easy", "medium", "hard", "mixed"] as const}
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Question types</label>
          <MultiSelectPills options={ALL_TYPES} value={types} onChange={setTypes} labels={TYPE_LABELS} />
        </div>

        <Button variant="primary" onClick={handleGenerate} disabled={!lesson || types.length === 0 || loading} className="w-full sm:w-auto sm:self-start">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
          Generate Quiz
        </Button>

        {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
      </Card>

      {questions && (
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const picked = answers[q.id];
            const isCorrect = picked !== undefined && picked.trim().toLowerCase() === q.answer.trim().toLowerCase();
            return (
              <Card key={q.id} className="p-5 flex flex-col gap-3">
                <p className="font-semibold text-sm">
                  {i + 1}. {q.question}
                </p>

                {q.type === "multiple_choice" && q.options && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const chosen = picked === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={clsx(
                            "text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-colors touch-manipulation",
                            chosen ? "border-signal bg-signal/10" : "border-ink-3 hover:border-signal/40"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "true_false" && (
                  <div className="flex gap-2">
                    {["True", "False"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={clsx(
                          "flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors touch-manipulation",
                          picked === opt ? "border-signal bg-signal/10" : "border-ink-3 hover:border-signal/40"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "identification" && (
                  <input
                    value={picked ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Type your answer"
                    className="w-full rounded-xl border-2 border-ink-3 bg-ink px-4 py-2.5 text-sm outline-none focus:border-signal"
                  />
                )}

                {picked !== undefined && (
                  <div className={clsx("flex items-start gap-2 text-sm mt-1", isCorrect ? "text-mint" : "text-danger")}>
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                    <div>
                      <p className="font-semibold">{isCorrect ? "Correct" : `Correct answer: ${q.answer}`}</p>
                      <p className="text-paper/60">{q.explanation}</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setRevealedSource(revealedSource === q.id ? null : q.id)}
                  className="text-xs text-paper/40 hover:text-signal flex items-center gap-1 self-start py-2 px-1 -mx-1 touch-manipulation"
                >
                  <Eye className="w-3.5 h-3.5" /> View source
                </button>
                {revealedSource === q.id && lesson && (
                  <div className="rounded-xl bg-ink p-3 text-xs text-paper/60">
                    <p className="font-semibold text-paper/70 mb-1">
                      {q.source.section} · chunk {q.source.chunk}
                    </p>
                    <p className="line-clamp-6 whitespace-pre-wrap">
                      {lesson.chunks.find((c) => c.index === q.source.chunk)?.text ?? "Source chunk not found."}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
