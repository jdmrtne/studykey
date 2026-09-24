import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LessonPicker } from "../components/ai/LessonPicker";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { AIErrorNotice } from "../components/ai/AIErrorNotice";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { generateJSON } from "../lib/aiService";
import { generateReviewerPrompt } from "../prompts/generateReviewer";
import { isReviewer, type Reviewer as ReviewerType } from "../types/study";
import { ReviewerView } from "../components/reviewer/ReviewerView";
import { Loader2 } from "lucide-react";

export function Reviewer() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lesson = useLessonsStore(selectSelectedLesson);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reviewer, setReviewer] = useState<ReviewerType | null>(null);

  async function handleGenerate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    setReviewer(null);
    try {
      const req = generateReviewerPrompt({ chunks: lesson.chunks, lessonTitle: lesson.title });
      const result = await generateJSON(config, req, isReviewer);
      setReviewer(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-display font-bold">Reviewer</h1>
        <NotConfiguredBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl w-full mx-auto">
      <h1 className="text-2xl font-display font-bold">Reviewer</h1>

      <Card className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Lesson</label>
          <LessonPicker />
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={!lesson || loading} className="w-full sm:w-auto sm:self-start">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
          Generate Reviewer
        </Button>
        {error !== null && <AIErrorNotice error={error} onRetry={handleGenerate} />}
      </Card>

      {reviewer && <ReviewerView reviewer={reviewer} />}
    </div>
  );
}
