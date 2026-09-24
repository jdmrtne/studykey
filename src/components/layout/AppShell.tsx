import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
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
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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

/** The four destinations that fit comfortably in a one-handed bottom bar. Everything else lives in "More". */
const MOBILE_PRIMARY = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/chat", label: "Chat", icon: MessageCircleQuestion },
];

const MOBILE_MORE_ITEMS = [
  { to: "/reviewer", label: "Reviewer", icon: Sparkles },
  { to: "/quiz", label: "Quiz", icon: ListChecks },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/ai-settings", label: "AI Settings", icon: KeyRound },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];
const MOBILE_MORE_PATHS = new Set(MOBILE_MORE_ITEMS.map((i) => i.to));

/** Study tools that need a selected lesson — shown dimmed (not hidden) when none is selected, so the nav stays stable. */
const LESSON_SCOPED_PATHS = new Set(["/reviewer", "/quiz", "/flashcards", "/chat"]);

/** Pages whose title lives in the top bar instead of taking up space inside the page body. */
const HEADER_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/chat": { title: "Chat", subtitle: "Ask questions about your lesson — answers stay grounded in it." },
};

const SIDEBAR_COLLAPSED_KEY = "studykey-sidebar-collapsed";

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectedLesson = useLessonsStore(selectSelectedLesson);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);

  // Close the "More" sheet whenever navigation actually happens.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // localStorage unavailable (privacy mode, etc.) — collapse state just won't persist.
    }
  }, [collapsed]);

  const moreActive = MOBILE_MORE_PATHS.has(location.pathname);
  const headerTitle = HEADER_TITLES[location.pathname];
  // Chat is a fixed-viewport screen: the page itself never scrolls, only the message list does,
  // so the chat header, input and quick actions stay put.
  const locked = location.pathname === "/chat";

  return (
    <div className={clsx("flex flex-col md:flex-row", locked ? "app-viewport-locked" : "min-h-screen")}>
      {/* ---------- Mobile top bar (md:hidden) ---------- */}
      <header
        className="md:hidden sticky top-0 z-30 flex items-center gap-2 px-4 border-b border-ink-3 bg-ink-2/90 backdrop-blur-sm"
        style={{ height: "var(--mobile-header-h)", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-signal text-night flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
            SK
          </span>
          <span className="font-display font-semibold truncate">StudyKey</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          {!isConfigured && (
            <Link
              to="/ai-settings"
              className="w-2 h-2 rounded-full bg-amber flex-shrink-0"
              title="AI provider not configured"
              aria-label="AI provider not configured — tap to set up"
            />
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ---------- Desktop sidebar (hidden on mobile) ---------- */}
      <aside
        className={clsx(
          "hidden md:flex md:flex-col border-r border-ink-3 bg-ink-2/60 backdrop-blur-sm transition-[width] duration-200 flex-shrink-0",
          locked ? "md:min-h-0" : "md:min-h-screen",
          collapsed ? "md:w-[4.5rem]" : "md:w-60"
        )}
      >
        <div
          className={clsx(
            "flex items-center border-b border-ink-3 flex-shrink-0",
            collapsed ? "justify-center px-2" : "px-4"
          )}
          style={{ height: "var(--topbar-h)" }}
        >
          <Link to="/" className={clsx("flex items-center gap-2 min-w-0", collapsed && "justify-center")}>
            <span className="w-8 h-8 rounded-xl bg-signal text-night flex items-center justify-center font-display font-bold flex-shrink-0">
              SK
            </span>
            {!collapsed && <span className="font-display font-semibold text-lg truncate">StudyKey</span>}
          </Link>
        </div>
        <nav className="flex flex-col flex-1 px-2 py-3 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const dimmed = LESSON_SCOPED_PATHS.has(to) && lessons.length === 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors relative",
                    collapsed ? "justify-center px-0" : "px-3",
                    isActive ? "bg-signal/15 text-signal" : "text-paper/70 hover:bg-ink-3/60 hover:text-paper",
                    dimmed && !isActive && "text-paper/35"
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!isConfigured && to === "/ai-settings" && (
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full bg-amber",
                      collapsed ? "absolute top-1.5 right-1.5" : "ml-auto"
                    )}
                    title="AI provider not configured"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className={clsx("border-t border-ink-3 flex-shrink-0", collapsed ? "px-2 py-2" : "px-2 py-2")}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={clsx(
              "flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors w-full text-paper/60 hover:bg-ink-3/60 hover:text-paper",
              collapsed ? "justify-center px-0" : "px-3"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Active-lesson bar — visible on every page so it's always obvious what's currently being studied.
            On desktop its height matches the sidebar's logo row (--topbar-h) so the two align. */}
        <div className="border-b border-ink-3 bg-ink-2/40 px-4 md:px-8 py-2.5 md:py-0 flex items-center flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto w-full md:h-[var(--topbar-h)]">
            {headerTitle ? (
              <>
                <h1 className="font-display font-bold text-base md:text-lg flex-shrink-0">{headerTitle.title}</h1>
                <span className="hidden xl:inline text-xs text-paper/45 truncate min-w-0 max-w-[22rem]">
                  {headerTitle.subtitle}
                </span>
                <span className="w-px h-4 bg-ink-3 flex-shrink-0" aria-hidden="true" />
              </>
            ) : null}
            <BookMarked className="w-4 h-4 text-paper/40 flex-shrink-0" />
            {lessons.length === 0 ? (
              <p className="text-xs text-paper/40 truncate">
                No lesson yet —{" "}
                <Link to="/lessons" className="text-signal hover:underline font-semibold">
                  add one
                </Link>{" "}
                to get started.
              </p>
            ) : (
              <>
                <span className="text-xs text-paper/40 flex-shrink-0 hidden sm:inline">Studying:</span>
                <span className="text-xs font-semibold text-paper/90 truncate min-w-0">
                  {selectedLesson ? selectedLesson.title : "No lesson selected"}
                </span>
              </>
            )}
            <div className="ml-auto flex items-center gap-2 md:gap-3 flex-shrink-0">
              {lessons.length > 0 && <LessonPicker compact />}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        <main
          className={clsx(
            "flex-1 min-w-0 w-full",
            // Chat: full-width so its scrollbar sits at the far right edge of the window, like any other site.
            // The chat panel centers its own content (see ChatPanel) instead of main doing it.
            locked
              ? "min-h-0 overflow-hidden flex flex-col pb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px))] md:pb-0"
              : "px-4 md:px-8 py-5 md:py-8 max-w-5xl mx-auto"
          )}
          style={
            locked
              ? undefined
              : { paddingBottom: "calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px) + 1.25rem)" }
          }
        >
          <Outlet />
        </main>
      </div>

      {/* ---------- Mobile bottom nav (md:hidden) ---------- */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around border-t border-ink-3 bg-ink-2/95 backdrop-blur-sm"
        style={{
          height: "calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Primary"
      >
        {MOBILE_PRIMARY.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex-1 flex flex-col items-center justify-center gap-1 tap-target text-[11px] font-semibold transition-colors",
                isActive ? "text-signal" : "text-paper/55"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-1 tap-target text-[11px] font-semibold transition-colors",
            moreActive ? "text-signal" : "text-paper/55"
          )}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <Menu className="w-5 h-5" strokeWidth={moreActive ? 2.5 : 2} />
          More
        </button>
      </nav>

      {/* ---------- "More" sheet (mobile secondary nav) ---------- */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="More">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-[1.5rem] border-t border-ink-3 bg-ink-2 p-4 flex flex-col gap-1"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-sm font-display font-semibold text-paper/80">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center text-paper/50 hover:text-paper hover:bg-ink-3/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {MOBILE_MORE_ITEMS.map(({ to, label, icon: Icon }) => {
              const dimmed = LESSON_SCOPED_PATHS.has(to) && lessons.length === 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-semibold transition-colors tap-target",
                      isActive ? "bg-signal/15 text-signal" : "text-paper/80 hover:bg-ink-3/60",
                      dimmed && "text-paper/40"
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{label}</span>
                  {to === "/ai-settings" && !isConfigured && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-amber" title="AI provider not configured" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
