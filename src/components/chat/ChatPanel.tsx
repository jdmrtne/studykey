import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleQuestion, SquarePen, ChevronDown, History } from "lucide-react";
import type { Lesson } from "../../types/lesson";
import type { ProviderConfig } from "../../lib/providers/types";
import { useChatStore, selectMessages, selectActiveThreadId } from "../../store/chatStore";
import { useLessonsStore } from "../../store/lessonsStore";
import { LessonPicker } from "../ai/LessonPicker";
import { ChatMessage } from "./ChatMessage";
import { ChatHistoryMenu } from "./ChatHistoryMenu";
import { ChatStarterPrompts } from "./ChatStarterPrompts";
import { ChatInput } from "./ChatInput";

interface Props {
  lesson: Lesson;
  config: ProviderConfig;
}

export function ChatPanel({ lesson, config }: Props) {
  const messages = useChatStore(selectMessages(lesson.id));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);
  const activeThreadId = useChatStore(selectActiveThreadId(lesson.id));
  const allThreads = useChatStore((s) => s.threads);
  const newChat = useChatStore((s) => s.newChat);
  const openThread = useChatStore((s) => s.openThread);
  const deleteThread = useChatStore((s) => s.deleteThread);
  const clearAllHistory = useChatStore((s) => s.clearAllHistory);
  const lessons = useLessonsStore((s) => s.lessons);
  const selectLesson = useLessonsStore((s) => s.selectLesson);

  // History shows chats from every lesson. Sorting here (not inside a store selector) keeps selector results stable.
  const sortedThreads = useMemo(() => [...allThreads].sort((a, b) => b.updatedAt - a.updatedAt), [allThreads]);
  const lessonTitles = useMemo(() => Object.fromEntries(lessons.map((l) => [l.id, l.title])), [lessons]);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  // Height of the floating input area (so the last message can scroll clear of it) and the width of the
  // message list's scrollbar (so the floating area stops short of it and never covers it).
  const [floatH, setFloatH] = useState(160);
  const [scrollbarW, setScrollbarW] = useState(0);

  const isBusy = messages.some((m) => m.pending);
  const hasFailedLast = messages.length > 0 && messages[messages.length - 1].error !== undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  useEffect(() => {
    const floating = floatRef.current;
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!floating || !scroller || !content) return;
    const measure = () => {
      setFloatH(floating.offsetHeight);
      setScrollbarW(scroller.offsetWidth - scroller.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(floating);
    ro.observe(scroller);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // Close the inline lesson switcher whenever the active lesson actually changes.
  useEffect(() => {
    setSwitcherOpen(false);
    setHistoryOpen(false);
  }, [lesson.id]);

  // Jump to the newest message whenever a different chat is opened (or a new one started).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeThreadId]);

  // A lesson switch always lands on a clean thread for that lesson (per-lesson
  // threads in the store already guarantee this — nothing extra to reset here).

  function handleSend(text: string) {
    void sendMessage(lesson, config, text);
  }

  function handleRetry() {
    void retryLastMessage(lesson, config);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Lesson header — always visible so the student is never unsure which lesson is being discussed. */}
      <div className="flex-shrink-0 relative">
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-3 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-signal/15 text-signal flex items-center justify-center flex-shrink-0">
            <MessageCircleQuestion className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-paper/40 font-semibold leading-none mb-0.5">
              Lesson
            </p>
            <p className="text-sm font-display font-semibold truncate">{lesson.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => newChat(lesson.id)}
              title="Start a new chat (this one stays in your history)"
              className="flex items-center gap-1.5 text-xs text-paper/50 hover:text-signal transition-colors px-2 py-1.5"
            >
              <SquarePen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}
          {/* Not positioned on mobile, so the history menu anchors to the whole header row (full width,
              always on screen); from sm up it hangs under this button like the other dropdowns. */}
          <div className="sm:relative">
            <button
              type="button"
              onClick={() => {
                setHistoryOpen((v) => !v);
                setSwitcherOpen(false);
              }}
              title="Chat history"
              aria-haspopup="dialog"
              aria-expanded={historyOpen}
              className={
                "flex items-center gap-1.5 text-xs transition-colors px-2 py-1.5 " +
                (historyOpen ? "text-signal" : "text-paper/50 hover:text-signal")
              }
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
              {sortedThreads.length > 0 && (
                <span className="text-[10px] font-semibold rounded-full bg-ink-3 text-paper/70 px-1.5 leading-4">
                  {sortedThreads.length}
                </span>
              )}
            </button>
            {historyOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />
                <div className="absolute inset-x-3 top-full mt-1 z-20 sm:inset-x-auto sm:right-0 sm:w-[22rem]">
                  <ChatHistoryMenu
                    threads={sortedThreads}
                    lessonTitles={lessonTitles}
                    activeId={activeThreadId}
                    onNew={() => {
                      newChat(lesson.id);
                      setHistoryOpen(false);
                    }}
                    onOpen={(id) => {
                      const thread = allThreads.find((t) => t.id === id);
                      if (!thread) return;
                      // Point the chat at the thread first, then switch the app to that chat's lesson,
                      // so the panel never flashes another chat from the lesson being switched to.
                      openThread(thread.lessonId, thread.id);
                      if (thread.lessonId !== lesson.id) selectLesson(thread.lessonId);
                      setHistoryOpen(false);
                    }}
                    onDelete={(id) => deleteThread(id)}
                    onClearAll={() => {
                      if (confirm("Delete all saved chats, across every lesson? This can't be undone.")) {
                        clearAllHistory();
                        setHistoryOpen(false);
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSwitcherOpen((v) => !v);
                setHistoryOpen(false);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline px-2 py-1.5"
            >
              Change
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-10">
                  <LessonPicker compact />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Message list — spans the full width so its scrollbar sits at the window's right edge;
          the messages themselves stay centered in a readable column. */}
      <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div
          ref={contentRef}
          className="max-w-5xl mx-auto w-full px-4 md:px-8 pt-5 flex flex-col gap-4 min-h-full"
          style={{ paddingBottom: floatH + 16 }}
        >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
              <p className="font-display font-semibold text-paper/90">What would you like explained?</p>
              <p className="text-sm text-paper/50 mt-1">
                Ask anything about <span className="text-paper/70">{lesson.title}</span> — I'll answer from the
                lesson itself.
              </p>
            </div>
            <ChatStarterPrompts onPick={handleSend} disabled={isBusy} />
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage
              key={m.id}
              message={m}
              onRetry={i === messages.length - 1 && hasFailedLast ? handleRetry : undefined}
            />
          ))
        )}
        </div>
      </div>

      {/* Floating input + quick actions: no divider line, they sit over the bottom of the message list and
          fade into the page. The wrapper ignores pointer events so the list stays scrollable around it. */}
      <div
        ref={floatRef}
        className="absolute bottom-0 left-0 pointer-events-none pt-10 pb-4"
        style={{ right: scrollbarW, background: "linear-gradient(to top, var(--color-ink) 55%, transparent)" }}
      >
        <div
          className="pointer-events-auto max-w-5xl mx-auto w-full px-4 md:px-8"
          onWheel={(e) => scrollRef.current?.scrollBy({ top: e.deltaY })}
        >
          <ChatInput onSend={handleSend} disabled={isBusy} />
        </div>
      </div>
      </div>
    </div>
  );
}
