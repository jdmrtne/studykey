import { create } from "zustand";
import type { ChatMessage } from "../types/chat";
import type { Lesson } from "../types/lesson";
import type { ProviderConfig } from "../lib/providers/types";
import { generate, AIServiceError } from "../lib/aiService";
import { buildChatPrompt } from "../prompts/chatLesson";

function newId(): string {
  return crypto.randomUUID();
}

interface ChatState {
  /** One message thread per lesson, kept for the session only (not persisted — spec section "message history during the session"). */
  conversationsByLesson: Record<string, ChatMessage[]>;
  sendMessage: (lesson: Lesson, config: ProviderConfig, question: string) => Promise<void>;
  retryLastMessage: (lesson: Lesson, config: ProviderConfig) => Promise<void>;
  clearConversation: (lessonId: string) => void;
}

async function runAssistantTurn(
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  lesson: Lesson,
  config: ProviderConfig,
  historyForPrompt: ChatMessage[],
  question: string,
  assistantMessageId: string
) {
  const { request, usedSections } = buildChatPrompt({
    lessonTitle: lesson.title,
    chunks: lesson.chunks,
    history: historyForPrompt,
    question,
  });

  try {
    const result = await generate(config, request);
    set((s) => ({
      conversationsByLesson: {
        ...s.conversationsByLesson,
        [lesson.id]: (s.conversationsByLesson[lesson.id] ?? []).map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: result.text.trim(), pending: false, sources: usedSections }
            : m
        ),
      },
    }));
  } catch (err) {
    const message =
      err instanceof AIServiceError ? err.message : err instanceof Error ? err.message : "The request failed unexpectedly.";
    set((s) => ({
      conversationsByLesson: {
        ...s.conversationsByLesson,
        [lesson.id]: (s.conversationsByLesson[lesson.id] ?? []).map((m) =>
          m.id === assistantMessageId ? { ...m, pending: false, error: message } : m
        ),
      },
    }));
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationsByLesson: {},

  sendMessage: async (lesson, config, question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const existing = get().conversationsByLesson[lesson.id] ?? [];
    const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed, createdAt: Date.now() };
    const assistantMessage: ChatMessage = {
      id: newId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      pending: true,
    };

    set((s) => ({
      conversationsByLesson: {
        ...s.conversationsByLesson,
        [lesson.id]: [...existing, userMessage, assistantMessage],
      },
    }));

    await runAssistantTurn(set, lesson, config, existing, trimmed, assistantMessage.id);
  },

  retryLastMessage: async (lesson, config) => {
    const thread = get().conversationsByLesson[lesson.id] ?? [];
    const lastUserIndex = [...thread].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const userIndex = thread.length - 1 - lastUserIndex;
    const question = thread[userIndex].content;
    const historyForPrompt = thread.slice(0, userIndex);

    const failedAssistant = thread[userIndex + 1];
    const assistantMessageId = failedAssistant?.role === "assistant" ? failedAssistant.id : newId();

    set((s) => {
      const current = s.conversationsByLesson[lesson.id] ?? [];
      const hasFailedSlot = current.some((m) => m.id === assistantMessageId);
      const next: ChatMessage[] = hasFailedSlot
        ? current.map((m) =>
            m.id === assistantMessageId ? { ...m, content: "", pending: true, error: undefined } : m
          )
        : [...current, { id: assistantMessageId, role: "assistant", content: "", createdAt: Date.now(), pending: true }];
      return { conversationsByLesson: { ...s.conversationsByLesson, [lesson.id]: next } };
    });

    await runAssistantTurn(set, lesson, config, historyForPrompt, question, assistantMessageId);
  },

  clearConversation: (lessonId) => {
    set((s) => {
      const next = { ...s.conversationsByLesson };
      delete next[lessonId];
      return { conversationsByLesson: next };
    });
  },
}));

// A stable, shared reference for "no messages yet". Returning a fresh `[]`
// literal from the selector below would give React a new array identity on
// every call even when nothing changed, which — under zustand's
// useSyncExternalStore-based subscriptions — triggers an infinite
// render loop ("Maximum update depth exceeded", React error #185) instead
// of ever painting the empty state.
const EMPTY_MESSAGES: ChatMessage[] = [];

export function selectMessages(lessonId: string | undefined) {
  return (s: ChatState): ChatMessage[] =>
    lessonId ? (s.conversationsByLesson[lessonId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES;
}
