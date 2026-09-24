import { useState } from "react";
import clsx from "clsx";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SelectPills } from "../components/ui/SelectPills";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { generateJSON } from "../lib/aiService";
import { generateFlashcardsPrompt } from "../prompts/generateFlashcards";
import { isFlashcardSet, type Flashcard } from "../types/study";
import { Loader2, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

export function Flashcards() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);

  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    setCards(null);
    setIndex(0);
    setFlipped(false);
    try {
      const req = generateFlashcardsPrompt({ chunks: lesson.chunks, cardCount: count });
      const result = await generateJSON(config, req, isFlashcardSet);
      setCards(result.cards);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-display font-bold">Flashcards</h1>
        <NotConfiguredBanner />
      </div>
    );
  }

  const current = cards?.[index];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold">Flashcards</h1>

      <Card className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Lesson</label>
          <LessonPicker />
        </div>
        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Number of cards</label>
          <SelectPills options={[10, 15, 20, 30]} value={count} onChange={setCount} />
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={!lesson || loading} className="w-full sm:w-auto sm:self-start">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
          Generate Flashcards
        </Button>
        {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
      </Card>

      {current && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-paper/40">
            Card {index + 1} of {cards!.length} · {current.source.section}
          </p>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? "Showing answer. Tap to show question." : "Showing question. Tap to show answer."}
            className="w-full max-w-md aspect-[3/2] rounded-[1.25rem] border-2 border-ink-3 bg-ink-2 flex items-center justify-center p-6 sm:p-8 text-center relative touch-manipulation"
          >
            <span className={clsx("font-display font-semibold text-lg", flipped && "text-paper/90")}>
              {flipped ? current.back : current.front}
            </span>
            <RotateCw className="w-4 h-4 absolute bottom-3 right-3 text-paper/30" />
          </button>
          <div className="flex items-center gap-3 w-full max-w-md justify-center">
            <Button
              variant="ghost"
              aria-label="Previous card"
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1));
                setFlipped(false);
              }}
              disabled={index === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-xs text-paper/40 tabular-nums px-2">
              {index + 1} / {cards!.length}
            </span>
            <Button
              variant="ghost"
              aria-label="Next card"
              onClick={() => {
                setIndex((i) => Math.min(cards!.length - 1, i + 1));
                setFlipped(false);
              }}
              disabled={index === cards!.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
