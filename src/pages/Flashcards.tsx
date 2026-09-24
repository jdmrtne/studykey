import { useMemo, useState } from "react";
import clsx from "clsx";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SelectPills } from "../components/ui/SelectPills";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { FlashcardHistoryMenu } from "../components/flashcards/FlashcardHistoryMenu";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { useFlashcardStore } from "../store/flashcardStore";
import { generateJSON } from "../lib/aiService";
import { generateFlashcardsPrompt } from "../prompts/generateFlashcards";
import { isFlashcardSet } from "../types/study";
import { Loader2, ChevronLeft, ChevronRight, RotateCw, History, RefreshCw } from "lucide-react";

export function Flashcards() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectLesson = useLessonsStore((s) => s.selectLesson);

  const decks = useFlashcardStore((s) => s.decks);
  const activeId = useFlashcardStore((s) => s.activeId);
  const saveFailed = useFlashcardStore((s) => s.saveFailed);
  const addDeck = useFlashcardStore((s) => s.addDeck);
  const openDeck = useFlashcardStore((s) => s.openDeck);
  const deleteDeck = useFlashcardStore((s) => s.deleteDeck);
  const clearAll = useFlashcardStore((s) => s.clearAll);
  const setPosition = useFlashcardStore((s) => s.setPosition);

  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [flipped, setFlipped] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Newest first. Sorted here (not in the store selector) so selector results stay referentially stable.
  const sorted = useMemo(() => [...decks].sort((a, b) => b.createdAt - a.createdAt), [decks]);

  // Which saved deck to show: the one last opened/generated if it belongs to the selected lesson (or its lesson has
  // since been deleted, so opening it from history still works); otherwise the newest deck for the selected lesson.
  const deck = useMemo(() => {
    const lessonIds = new Set(lessons.map((l) => l.id));
    const active = sorted.find((d) => d.id === activeId);
    if (active && (active.lessonId === lesson?.id || !lessonIds.has(active.lessonId))) return active;
    return lesson ? sorted.find((d) => d.lessonId === lesson.id) : undefined;
  }, [sorted, activeId, lesson, lessons]);

  const cards = deck?.cards ?? [];
  const index = deck ? Math.min(Math.max(deck.position, 0), cards.length - 1) : 0;
  const current = deck ? cards[index] : undefined;

  function goTo(next: number) {
    if (!deck) return;
    setPosition(deck.id, Math.min(Math.max(next, 0), cards.length - 1));
    setFlipped(false);
  }

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    try {
      const req = generateFlashcardsPrompt({ chunks: lesson.chunks, cardCount: count });
      // Give longer structured replies (up to 30 cards) more room than the chat default; custom endpoints may cap lower.
      const roomy: typeof req =
        config.provider === "custom" ? req : { ...req, maxOutputTokens: Math.max(config.maxOutputTokens ?? 0, 8192) };
      const result = await generateJSON(config, roomy, isFlashcardSet);
      // Saved automatically; the previous deck stays in history.
      addDeck(lesson, result.cards);
      setFlipped(false);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(id: string) {
    const item = decks.find((d) => d.id === id);
    if (!item) return;
    openDeck(id);
    if (lessons.some((l) => l.id === item.lessonId) && item.lessonId !== lesson?.id) selectLesson(item.lessonId);
    setFlipped(false);
    setHistoryOpen(false);
  }

  const header = (
    <div className="relative flex items-center justify-between gap-3">
      <div>
<h1 className="text-2xl font-display font-bold">Flashcards</h1>
<p className="text-paper/60 text-sm mt-1">Strengthen your memory.</p>
</div>
      <button
        type="button"
        onClick={() => setHistoryOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={historyOpen}
        className={
          "flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors touch-manipulation " +
          (historyOpen
            ? "border-signal text-signal bg-signal/10"
            : "border-ink-3 bg-ink-2 text-paper/80 hover:border-signal/50 hover:text-paper")
        }
      >
        <History className="w-4 h-4" />
        History
        {sorted.length > 0 && (
          <span className="text-[11px] font-bold rounded-full bg-signal text-night px-1.5 min-w-[1.25rem] text-center leading-5">
            {sorted.length}
          </span>
        )}
      </button>
      {historyOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-x-0 top-full mt-2 z-20 sm:inset-x-auto sm:right-0 sm:w-[24rem]">
            <FlashcardHistoryMenu
              items={sorted}
              activeId={deck?.id ?? null}
              onOpen={handleOpen}
              onDelete={deleteDeck}
              onClearAll={() => {
                if (confirm("Delete all saved flashcards, across every lesson? This can't be undone.")) {
                  clearAll();
                  setHistoryOpen(false);
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );

  const deckView = current && deck && (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-paper/40">
        Card {index + 1} of {cards.length} · {current.source.section}
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
        <Button variant="ghost" aria-label="Previous card" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-xs text-paper/40 tabular-nums px-2">
          {index + 1} / {cards.length}
        </span>
        <Button
          variant="ghost"
          aria-label="Next card"
          onClick={() => goTo(index + 1)}
          disabled={index === cards.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
        {header}
        {deckView}
        <NotConfiguredBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
      {header}

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
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
          ) : deck ? (
            <RefreshCw className="w-4 h-4 mr-2 inline" />
          ) : null}
          {deck ? "Generate new flashcards" : "Generate Flashcards"}
        </Button>
        {deck && !loading && (
          <p className="text-xs text-paper/45 -mt-2">
            Flashcards are saved automatically, along with where you stopped. Generating new ones keeps the old deck in
            History.
          </p>
        )}
        {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
        {saveFailed && (
          <p className="text-sm text-danger">
            Couldn't save to this browser's storage (it's probably full), so this deck will be lost when you leave the
            page. Delete old decks, reviewers, lessons or chats to free space.
          </p>
        )}
      </Card>

      {deckView}
    </div>
  );
}
