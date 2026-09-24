import { useMemo, useState } from "react";
import { History, Loader2, RefreshCw } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { ReviewerView } from "../components/reviewer/ReviewerView";
import { ReviewerHistoryMenu } from "../components/reviewer/ReviewerHistoryMenu";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { useReviewerStore } from "../store/reviewerStore";
import { generateJSON } from "../lib/aiService";
import { generateReviewerPrompt } from "../prompts/generateReviewer";
import { isReviewer } from "../types/study";

export function Reviewer() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectLesson = useLessonsStore((s) => s.selectLesson);

  const saved = useReviewerStore((s) => s.reviewers);
  const activeId = useReviewerStore((s) => s.activeId);
  const saveFailed = useReviewerStore((s) => s.saveFailed);
  const addReviewer = useReviewerStore((s) => s.addReviewer);
  const openReviewer = useReviewerStore((s) => s.openReviewer);
  const deleteReviewer = useReviewerStore((s) => s.deleteReviewer);
  const clearAll = useReviewerStore((s) => s.clearAll);
  const setReviewedSections = useReviewerStore((s) => s.setReviewedSections);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Newest first. Sorted here (not in the store selector) so selector results stay referentially stable.
  const sorted = useMemo(() => [...saved].sort((a, b) => b.createdAt - a.createdAt), [saved]);

  // Which saved reviewer to show: the one last opened/generated if it belongs to the selected lesson (or its lesson
  // has since been deleted, so opening it from history still works); otherwise the newest one for the selected lesson.
  const current = useMemo(() => {
    const lessonIds = new Set(lessons.map((l) => l.id));
    const active = sorted.find((r) => r.id === activeId);
    if (active && (active.lessonId === lesson?.id || !lessonIds.has(active.lessonId))) return active;
    return lesson ? sorted.find((r) => r.lessonId === lesson.id) : undefined;
  }, [sorted, activeId, lesson, lessons]);

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    try {
      const req = generateReviewerPrompt({ chunks: lesson.chunks, lessonTitle: lesson.title });
      // The reviewer is the longest structured reply, so give it more room than the chat default
      // (custom OpenAI-compatible endpoints may cap output lower, so leave those alone).
      const roomy: typeof req =
        config.provider === "custom" ? req : { ...req, maxOutputTokens: Math.max(config.maxOutputTokens ?? 0, 8192) };
      const result = await generateJSON(config, roomy, isReviewer);
      // Saved automatically; the previous version stays in history.
      addReviewer(lesson, result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(id: string) {
    const item = saved.find((r) => r.id === id);
    if (!item) return;
    openReviewer(id);
    if (lessons.some((l) => l.id === item.lessonId) && item.lessonId !== lesson?.id) selectLesson(item.lessonId);
    setHistoryOpen(false);
  }

  const historyButton = (
    <div className="relative sm:static">
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
    </div>
  );

  const historyMenu = historyOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />
      <div className="absolute inset-x-0 top-full mt-2 z-20 sm:inset-x-auto sm:right-0 sm:w-[24rem]">
        <ReviewerHistoryMenu
          items={sorted}
          activeId={current?.id ?? null}
          onOpen={handleOpen}
          onDelete={deleteReviewer}
          onClearAll={() => {
            if (confirm("Delete all saved reviewers, across every lesson? This can't be undone.")) {
              clearAll();
              setHistoryOpen(false);
            }
          }}
        />
      </div>
    </>
  );

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl w-full mx-auto">
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="text-2xl font-display font-bold">Reviewer</h1>
          {historyButton}
          {historyMenu}
        </div>
        {current && <ReviewerView key={current.id} reviewer={current.reviewer} initialReviewed={current.reviewedSections} onReviewedChange={(sections) => setReviewedSections(current.id, sections)} />}
        <NotConfiguredBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl w-full mx-auto">
      <div className="relative flex items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Reviewer</h1>
        {historyButton}
        {historyMenu}
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Lesson</label>
          <LessonPicker />
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={!lesson || loading} className="w-full sm:w-auto sm:self-start">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
          ) : current ? (
            <RefreshCw className="w-4 h-4 mr-2 inline" />
          ) : null}
          {current ? "Generate new reviewer" : "Generate Reviewer"}
        </Button>
        {current && !loading && (
          <p className="text-xs text-paper/45 -mt-2">
            Reviewers are saved automatically. Generating a new one keeps the old one in History.
          </p>
        )}
        {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
        {saveFailed && (
          <p className="text-sm text-danger">
            Couldn't save to this browser's storage (it's probably full), so this reviewer will be lost when you leave
            the page. Delete old reviewers, lessons or chats to free space.
          </p>
        )}
      </Card>

      {current && (
        <ReviewerView
          key={current.id}
          reviewer={current.reviewer}
          initialReviewed={current.reviewedSections}
          onReviewedChange={(sections) => setReviewedSections(current.id, sections)}
        />
      )}
    </div>
  );
}
