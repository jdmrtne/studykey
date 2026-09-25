import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useLessonsStore } from "../../store/lessonsStore";
import type { Lesson } from "../../types/lesson";

interface Props {
  /** Compact pill styling for use inline in a header (e.g. the Chat lesson bar). */
  compact?: boolean;
  className?: string;
}

const READER_PATH = /^\/lessons\/[^/]+\/read$/;

export function LessonPicker({ compact, className }: Props) {
  const lessons = useLessonsStore((s) => s.lessons);
  const selectedLessonId = useLessonsStore((s) => s.selectedLessonId);
  const selectLesson = useLessonsStore((s) => s.selectLesson);
  const location = useLocation();
  const navigate = useNavigate();

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-paper/50">
        No lessons yet.{" "}
        <Link to="/lessons" className="text-signal hover:underline">
          Add one first
        </Link>
        .
      </p>
    );
  }

  const handleChange = (newId: string) => {
    selectLesson(newId || null);
    // This picker is shown on every page, including the reader itself. The reader is keyed off
    // the lesson id in the URL rather than the "active lesson" above, so without this, picking a
    // different lesson here while reading would update the active-lesson state everywhere else
    // but leave the reader pane showing the old document.
    if (newId && READER_PATH.test(location.pathname)) {
      navigate(`/lessons/${newId}/read`);
    }
  };

  return (
    <select
      value={selectedLessonId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className={clsx(
        "outline-none transition-colors",
        compact
          ? "w-full rounded-full border-2 border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-semibold text-paper focus:border-signal"
          : "w-full rounded-2xl border-2 border-ink-3 bg-ink px-4 py-3 text-sm text-paper focus:border-signal",
        className
      )}
    >
      <option value="" disabled>
        Select a lesson...
      </option>
      {lessons.map((l: Lesson) => (
        <option key={l.id} value={l.id}>
          {l.title} ({l.chunks.length} chunks)
        </option>
      ))}
    </select>
  );
}
