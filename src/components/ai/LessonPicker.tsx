import { Link } from "react-router-dom";
import clsx from "clsx";
import { useLessonsStore } from "../../store/lessonsStore";
import type { Lesson } from "../../types/lesson";

interface Props {
  /** Compact pill styling for use inline in a header (e.g. the Chat lesson bar). */
  compact?: boolean;
  className?: string;
}

export function LessonPicker({ compact, className }: Props) {
  const lessons = useLessonsStore((s) => s.lessons);
  const selectedLessonId = useLessonsStore((s) => s.selectedLessonId);
  const selectLesson = useLessonsStore((s) => s.selectLesson);

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

  return (
    <select
      value={selectedLessonId ?? ""}
      onChange={(e) => selectLesson(e.target.value || null)}
      className={clsx(
        "outline-none transition-colors",
        compact
          ? "rounded-full border-2 border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-semibold text-paper focus:border-signal max-w-[12rem]"
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
