import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";
import { estimateTokens } from "../lib/documentPipeline";
import {
  Upload,
  ClipboardPaste,
  Sparkles,
  ListChecks,
  Layers,
  MessageCircleQuestion,
  BookOpen,
  Layers as ChunksIcon,
} from "lucide-react";

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

const STUDY_ACTIONS = [
  { to: "/reviewer", label: "Study (Reviewer)", icon: Sparkles },
  { to: "/quiz", label: "Generate Quiz", icon: ListChecks },
  { to: "/flashcards", label: "Generate Flashcards", icon: Layers },
  { to: "/chat", label: "Open Chat", icon: MessageCircleQuestion },
];

export function Dashboard() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectedLesson = useLessonsStore(selectSelectedLesson);
  const selectLesson = useLessonsStore((s) => s.selectLesson);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Welcome to Memora</h1>
        <p className="text-paper/60 text-sm mt-1">
          Learn smarter. Remember more.
        </p>
      </div>

      {!isConfigured && <NotConfiguredBanner />}

      {lessons.length === 0 ? (
        <Card className="p-6 sm:p-10 flex flex-col items-center text-center gap-5">
          <span className="w-14 h-14 rounded-2xl bg-signal/10 text-signal flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </span>
          <div>
            <h2 className="text-xl font-display font-bold">Turn any lesson into a study kit</h2>
            <p className="text-sm text-paper/60 mt-2 max-w-md">
              Add a lesson — a file or pasted text — and Memora can generate a reviewer, quiz, and flashcards
              from it, or you can just ask it questions directly in Chat.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/lessons">
              <Button variant="primary">
                <Upload className="w-4 h-4 mr-2 inline" />
                Upload Lesson
              </Button>
            </Link>
            <Link to="/lessons">
              <Button variant="ghost">
                <ClipboardPaste className="w-4 h-4 mr-2 inline" />
                Paste Lesson
              </Button>
            </Link>
          </div>
        </Card>
      ) : !selectedLesson ? (
        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <h2 className="font-display font-semibold">Select a lesson to get started</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {lessons.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => selectLesson(l.id)}
                className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-ink-3 bg-ink-2 hover:border-signal/50 transition-colors"
              >
                {l.title}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-signal font-semibold mb-1">
                  Currently studying
                </p>
                <h2 className="text-xl font-display font-bold truncate">{selectedLesson.title}</h2>
                <p className="text-xs text-paper/40 mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <ChunksIcon className="w-3 h-3" />
                  {selectedLesson.chunks.length} chunk{selectedLesson.chunks.length === 1 ? "" : "s"} · ~
                  {estimateTokens(selectedLesson.rawText)} tokens · added {timeAgo(selectedLesson.createdAt)}
                </p>
              </div>
              <Link to="/lessons" className="text-xs text-signal hover:underline flex-shrink-0 mt-1">
                Change lesson
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STUDY_ACTIONS.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}>
                  <div className="rounded-2xl border-2 border-ink-3 bg-ink hover:border-signal/50 transition-colors p-4 flex flex-col items-center gap-2 text-center h-full">
                    <span className="w-9 h-9 rounded-xl bg-signal/10 text-signal flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {lessons.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-paper/40 uppercase tracking-wide">Switch lesson</p>
              <div className="flex flex-wrap gap-2">
                {lessons
                  .filter((l) => l.id !== selectedLesson.id)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => selectLesson(l.id)}
                      className="px-3.5 py-2 rounded-full text-xs font-semibold border-2 border-ink-3 bg-ink-2 text-paper/70 hover:border-signal/50 hover:text-paper transition-colors"
                    >
                      {l.title}
                    </button>
                  ))}
                <Link
                  to="/lessons"
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border-2 border-dashed border-ink-3 text-paper/40 hover:border-signal/50 hover:text-signal transition-colors"
                >
                  + Add lesson
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
