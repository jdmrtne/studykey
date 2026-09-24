import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, RotateCcw, ChevronDown } from "lucide-react";
import type { Lesson } from "../../types/lesson";
import type { ProviderConfig } from "../../lib/providers/types";
import { useChatStore, selectMessages } from "../../store/chatStore";
import { LessonPicker } from "../ai/LessonPicker";
import { ChatMessage } from "./ChatMessage";
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
  const clearConversation = useChatStore((s) => s.clearConversation);

  const [switcherOpen, setSwitcherOpen] = useState(false);
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
  }, [lesson.id]);

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
      <div className="flex-shrink-0">
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
              onClick={() => clearConversation(lesson.id)}
              title="Start a new conversation"
              className="flex items-center gap-1.5 text-xs text-paper/50 hover:text-signal transition-colors px-2 py-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
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
