import { create } from "zustand";
import type { ChatMessage } from "../types/chat";
import type { Lesson } from "../types/lesson";
import type { ProviderConfig } from "../lib/providers/types";
import { generate, AIServiceError } from "../lib/aiService";
import { buildChatPrompt } from "../prompts/chatLesson";

function newId(): string {
  return crypto.randomUUID();
}

const STORAGE_KEY = "studykey-chat-history";

/**
 * One thread per lesson, persisted to localStorage so refreshing (or
 * reopening the browser) doesn't erase conversations. Follows the same
 * load/persist-helper pattern as useLessonsStore.
 */
function loadConversations(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    // Guard against corrupted/unexpected data so a bad value can't crash
    // startup — fall back to no saved history instead of throwing.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, ChatMessage[]> = {};
    for (const [lessonId, thread] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(thread)) continue;
      // A message still marked "pending" was mid-request when the tab
      // closed — that request is gone, so surface it as a stopped turn on
      // reload instead of showing a spinner that will never resolve.
      result[lessonId] = (thread as ChatMessage[]).map((m) =>
        m.pending ? { ...m, pending: false, error: m.error ?? "Interrupted — send again." } : m
      );
    }
    return result;
  } catch {
    return {};
  }
}

function persistConversations(conversations: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Chat transcripts can grow large; if they don't fit (private
    // browsing, quota), the current session still works in memory —
    // persistence is best-effort, same as lesson storage.
  }
}

interface ChatState {
  /** One message thread per lesson, persisted to localStorage (see loadConversations/persistConversations above). */
  conversationsByLesson: Record<string, ChatMessage[]>;
  sendMessage: (lesson: Lesson, config: ProviderConfig, question: string) => Promise<void>;
  retryLastMessage: (lesson: Lesson, config: ProviderConfig) => Promise<void>;
  clearConversation: (lessonId: string) => void;
}

async function runAssistantTurn(
  set: (fn: (s: ChatState) => Partial<ChatState>) => void,
  get: () => ChatState,
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
  persistConversations(get().conversationsByLesson);
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationsByLesson: loadConversations(),

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
    // Persist right away so the user's message survives a refresh even if
    // the assistant reply is still in flight or the tab closes mid-request.
    persistConversations(get().conversationsByLesson);

    await runAssistantTurn(set, get, lesson, config, existing, trimmed, assistantMessage.id);
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
    persistConversations(get().conversationsByLesson);

    await runAssistantTurn(set, get, lesson, config, historyForPrompt, question, assistantMessageId);
  },

  clearConversation: (lessonId) => {
    set((s) => {
      const next = { ...s.conversationsByLesson };
      delete next[lessonId];
      return { conversationsByLesson: next };
    });
    persistConversations(get().conversationsByLesson);
  },
}));

// A stable, shared reference for "no messages yet". Returning a fresh `[]`
// literal from the selector below would give React a new array identity on
// every call even when nothing changed, which — under zustand's
// useSyncExternalStore-based subscriptions — triggers an infinite
// render loop (\"Maximum update depth exceeded\", React error #185) instead
// of ever painting the empty state.
const EMPTY_MESSAGES: ChatMessage[] = [];

export function selectMessages(lessonId: string | undefined) {
  return (s: ChatState): ChatMessage[] =>
    lessonId ? (s.conversationsByLesson[lessonId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES;
}
