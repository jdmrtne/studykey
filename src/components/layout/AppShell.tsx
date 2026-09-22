import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Layers,
  Sparkles,
  MessageCircleQuestion,
  Settings as SettingsIcon,
  KeyRound,
  BookMarked,
} from "lucide-react";
import clsx from "clsx";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LessonPicker } from "../ai/LessonPicker";
import { useAISettingsStore, selectIsConfigured } from "../../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../../store/lessonsStore";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/reviewer", label: "Reviewer", icon: Sparkles },
  { to: "/quiz", label: "Quiz", icon: ListChecks },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/chat", label: "Chat", icon: MessageCircleQuestion },
  { to: "/ai-settings", label: "AI Settings", icon: KeyRound },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Study tools that need a selected lesson — shown dimmed (not hidden) when none is selected, so the nav stays stable. */
const LESSON_SCOPED_PATHS = new Set(["/reviewer", "/quiz", "/flashcards", "/chat"]);

export function AppShell() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectedLesson = useLessonsStore(selectSelectedLesson);

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <aside className="sm:w-60 sm:min-h-screen border-b sm:border-b-0 sm:border-r border-ink-3 bg-ink-2/60 backdrop-blur-sm flex sm:flex-col">
        <div className="px-5 py-4 flex items-center gap-2 sm:border-b sm:border-ink-3">
          <span className="w-8 h-8 rounded-xl bg-signal text-night flex items-center justify-center font-display font-bold">
            SK
          </span>
          <span className="font-display font-semibold text-lg hidden sm:inline">StudyKey</span>
        </div>
        <nav className="flex sm:flex-col flex-1 overflow-x-auto sm:overflow-visible px-2 sm:py-3 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const dimmed = LESSON_SCOPED_PATHS.has(to) && lessons.length === 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors",
                    isActive ? "bg-signal/15 text-signal" : "text-paper/70 hover:bg-ink-3/60 hover:text-paper",
                    dimmed && !isActive && "text-paper/35"
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {to === "/ai-settings" && !isConfigured && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber" title="AI provider not configured" />
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden sm:flex px-4 py-4 border-t border-ink-3 items-center justify-between">
          <span className="text-xs text-paper/40">BYOK — your key, your data</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Active-lesson bar — visible on every page so it's always obvious what's currently being studied. */}
        <div className="border-b border-ink-3 bg-ink-2/40 px-4 sm:px-8 py-2.5 flex items-center gap-3">
          <BookMarked className="w-4 h-4 text-paper/40 flex-shrink-0" />
          {lessons.length === 0 ? (
            <p className="text-xs text-paper/40">
              No lesson yet —{" "}
              <Link to="/lessons" className="text-signal hover:underline font-semibold">
                add one
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <>
              <span className="text-xs text-paper/40 flex-shrink-0">Studying:</span>
              <span className="text-xs font-semibold text-paper/90 truncate max-w-[14rem] sm:max-w-sm">
                {selectedLesson ? selectedLesson.title : "No lesson selected"}
              </span>
              <div className="ml-auto flex-shrink-0">
                <LessonPicker compact />
              </div>
            </>
          )}
        </div>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
