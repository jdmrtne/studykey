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

  const isBusy = messages.some((m) => m.pending);
  const hasFailedLast = messages.length > 0 && messages[messages.length - 1].error !== undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

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
    <div className="flex flex-col h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-7rem)] max-h-[46rem] rounded-[1.25rem] border border-ink-3 bg-ink-2/80 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden">
      {/* Lesson header — always visible so the student is never unsure which lesson is being discussed. */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-ink-3 bg-ink-2">
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

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 flex flex-col gap-4">
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

      {/* Input */}
      <div className="border-t border-ink-3 bg-ink-2 px-4 sm:px-5 py-4">
        <ChatInput onSend={handleSend} disabled={isBusy} />
      </div>
    </div>
  );
}
