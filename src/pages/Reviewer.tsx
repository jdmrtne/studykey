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
    <div className="flex flex-col gap-6 max-w-2xl">
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

      {reviewer && (
        <Card className="p-5 sm:p-6 flex flex-col gap-6">
          <h2 className="text-xl font-display font-bold">{reviewer.title}</h2>
          {reviewer.sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 pb-5 border-b border-ink-3 last:border-0 last:pb-0">
              <h3 className="font-display font-semibold">{s.heading}</h3>
              <p className="text-sm text-paper/70">{s.summary}</p>
              <ul className="list-disc list-inside text-sm text-paper/70 flex flex-col gap-1">
                {s.keyPoints.map((k, j) => (
                  <li key={j}>{k}</li>
                ))}
              </ul>
              <p className="text-xs text-paper/30">
                Source: {s.source.section} · chunk {s.source.chunk}
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
