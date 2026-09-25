import { create } from "zustand";
import type { ChatMessage, ChatThread } from "../types/chat";
import type { Lesson } from "../types/lesson";
import type { ProviderConfig } from "../lib/providers/types";
import { generate, AIServiceError } from "../lib/aiService";
import { buildChatPrompt } from "../prompts/chatLesson";
import { useUserPreferencesStore, getUserNickname } from "./userPreferencesStore";
import { detectNicknameAction } from "../lib/nicknameTrigger";

function newId(): string {
  return crypto.randomUUID();
}

const THREADS_KEY = "studykey-chat-threads";
const ACTIVE_KEY = "studykey-chat-active";
/** Pre-history storage: exactly one conversation per lesson. Migrated into a thread on first load. */
const LEGACY_KEY = "studykey-chat-history";
/** Oldest chats beyond this many are dropped so history can't grow without bound and fill browser storage. */
const MAX_THREADS = 100;

function titleFrom(question: string): string {
  const oneLine = question.replace(/\s+/g, " ").trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}...` : oneLine || "New chat";
}

/** A message still marked "pending" was mid-request when the tab closed — surface it as a stopped turn. */
function settleMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) =>
    m.pending ? { ...m, pending: false, error: m.error ?? "Interrupted — send again." } : m
  );
}

function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return (parsed as ChatThread[])
          .filter((t) => t && typeof t.id === "string" && typeof t.lessonId === "string" && Array.isArray(t.messages))
          .map((t) => ({ ...t, messages: settleMessages(t.messages) }));
      }
    }

    // First run after chat history was introduced: turn each lesson's single conversation into a thread.
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return [];
    const legacy: unknown = JSON.parse(legacyRaw);
    if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return [];
    const migrated: ChatThread[] = [];
    for (const [lessonId, thread] of Object.entries(legacy as Record<string, unknown>)) {
      if (!Array.isArray(thread) || thread.length === 0) continue;
      const messages = settleMessages(thread as ChatMessage[]);
      const firstUser = messages.find((m) => m.role === "user");
      migrated.push({
        id: newId(),
        lessonId,
        title: titleFrom(firstUser?.content ?? ""),
        createdAt: messages[0].createdAt ?? Date.now(),
        updatedAt: messages[messages.length - 1].createdAt ?? Date.now(),
        messages,
      });
    }
    // Only drop the old copy once the new one is safely written.
    if (persistThreads(migrated)) {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // harmless — it'll simply be ignored next time because THREADS_KEY now exists
      }
    }
    return migrated;
  } catch {
    return [];
  }
}

function loadActive(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string | null>) : {};
  } catch {
    return {};
  }
}

function persistThreads(threads: ChatThread[]): boolean {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    return true;
  } catch {
    // Quota / private browsing: the current session still works in memory; persistence is best-effort.
    return false;
  }
}

function persistActive(active: Record<string, string | null>) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  } catch {
    // best-effort
  }
}

interface ChatState {
  /** Every saved conversation, across all lessons. */
  threads: ChatThread[];
  /** Which thread is open for each lesson. null/undefined = a fresh, not-yet-saved chat. */
  activeThreadByLesson: Record<string, string | null>;
  sendMessage: (lesson: Lesson, config: ProviderConfig, question: string) => Promise<void>;
  retryLastMessage: (lesson: Lesson, config: ProviderConfig) => Promise<void>;
  /** Start a fresh chat. The current one stays in history. */
  newChat: (lessonId: string) => void;
  openThread: (lessonId: string, threadId: string) => void;
  deleteThread: (threadId: string) => void;
  /** Delete every saved chat, across all lessons. */
  clearAllHistory: () => void;
}

function activeThreadOf(s: ChatState, lessonId: string): ChatThread | undefined {
  const id = s.activeThreadByLesson[lessonId];
  return id ? s.threads.find((t) => t.id === id && t.lessonId === lessonId) : undefined;
}

type Setter = (fn: (s: ChatState) => Partial<ChatState>) => void;

function updateThread(set: Setter, threadId: string, fn: (t: ChatThread) => ChatThread) {
  set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? fn(t) : t)) }));
}

async function runAssistantTurn(
  set: Setter,
  get: () => ChatState,
  lesson: Lesson,
  config: ProviderConfig,
  threadId: string,
  historyForPrompt: ChatMessage[],
  question: string,
  assistantMessageId: string,
  nickname: string | null,
  nicknameJustActivated: boolean
) {
  const { request, usedSections } = buildChatPrompt({
    lessonTitle: lesson.title,
    chunks: lesson.chunks,
    history: historyForPrompt,
    question,
    nickname,
    nicknameJustActivated,
  });

  try {
    const result = await generate(config, request);
    updateThread(set, threadId, (t) => ({
      ...t,
      updatedAt: Date.now(),
      messages: t.messages.map((m) =>
        m.id === assistantMessageId
          ? { ...m, content: result.text.trim(), pending: false, sources: usedSections }
          : m
      ),
    }));
  } catch (err) {
    const message =
      err instanceof AIServiceError ? err.message : err instanceof Error ? err.message : "The request failed unexpectedly.";
    updateThread(set, threadId, (t) => ({
      ...t,
      messages: t.messages.map((m) => (m.id === assistantMessageId ? { ...m, pending: false, error: message } : m)),
    }));
  }
  persistThreads(get().threads);
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: loadThreads(),
  activeThreadByLesson: loadActive(),

  sendMessage: async (lesson, config, question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    // The "bebi" nickname Easter egg: only ever evaluated against the student's own typed message,
    // never lesson content or history, so nothing in an uploaded document can trigger or clear it.
    const previousNickname = getUserNickname();
    const nicknameAction = detectNicknameAction(trimmed);
    if (nicknameAction === "activate" && previousNickname !== "bebi") {
      useUserPreferencesStore.getState().setNickname("bebi");
    } else if (nicknameAction === "deactivate" && previousNickname !== null) {
      useUserPreferencesStore.getState().setNickname(null);
    }
    const nickname = getUserNickname();
    const nicknameJustActivated = nicknameAction === "activate" && previousNickname !== "bebi";

    const now = Date.now();
    const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed, createdAt: now };
    const assistantMessage: ChatMessage = { id: newId(), role: "assistant", content: "", createdAt: now, pending: true };

    let thread = activeThreadOf(get(), lesson.id);
    const existing = thread?.messages ?? [];
    let threadId: string;

    if (thread) {
      threadId = thread.id;
      updateThread(set, threadId, (t) => ({
        ...t,
        updatedAt: now,
        messages: [...t.messages, userMessage, assistantMessage],
      }));
    } else {
      // First message of a new chat: create the thread now (so empty chats never clutter the history).
      threadId = newId();
      thread = {
        id: threadId,
        lessonId: lesson.id,
        title: titleFrom(trimmed),
        createdAt: now,
        updatedAt: now,
        messages: [userMessage, assistantMessage],
      };
      const created = thread;
      set((s) => {
        const all = [created, ...s.threads];
        // Keep the newest MAX_THREADS chats (never the one just created).
        const kept =
          all.length > MAX_THREADS
            ? [created, ...[...s.threads].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_THREADS - 1)]
            : all;
        return { threads: kept, activeThreadByLesson: { ...s.activeThreadByLesson, [lesson.id]: created.id } };
      });
      persistActive(get().activeThreadByLesson);
    }
    // Persist right away so the user's message survives a refresh even if the reply is still in flight.
    persistThreads(get().threads);

    await runAssistantTurn(set, get, lesson, config, threadId, existing, trimmed, assistantMessage.id, nickname, nicknameJustActivated);
  },

  retryLastMessage: async (lesson, config) => {
    const thread = activeThreadOf(get(), lesson.id);
    if (!thread) return;
    const messages = thread.messages;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const userIndex = messages.length - 1 - lastUserIndex;
    const question = messages[userIndex].content;
    const historyForPrompt = messages.slice(0, userIndex);

    const failedAssistant = messages[userIndex + 1];
    const assistantMessageId = failedAssistant?.role === "assistant" ? failedAssistant.id : newId();

    updateThread(set, thread.id, (t) => {
      const hasFailedSlot = t.messages.some((m) => m.id === assistantMessageId);
      const next: ChatMessage[] = hasFailedSlot
        ? t.messages.map((m) => (m.id === assistantMessageId ? { ...m, content: "", pending: true, error: undefined } : m))
        : [...t.messages, { id: assistantMessageId, role: "assistant", content: "", createdAt: Date.now(), pending: true }];
      return { ...t, messages: next };
    });
    persistThreads(get().threads);

    await runAssistantTurn(set, get, lesson, config, thread.id, historyForPrompt, question, assistantMessageId, getUserNickname(), false);
  },

  newChat: (lessonId) => {
    set((s) => ({ activeThreadByLesson: { ...s.activeThreadByLesson, [lessonId]: null } }));
    persistActive(get().activeThreadByLesson);
  },

  openThread: (lessonId, threadId) => {
    set((s) => ({ activeThreadByLesson: { ...s.activeThreadByLesson, [lessonId]: threadId } }));
    persistActive(get().activeThreadByLesson);
  },

  deleteThread: (threadId) => {
    set((s) => {
      const target = s.threads.find((t) => t.id === threadId);
      const active = { ...s.activeThreadByLesson };
      if (target && active[target.lessonId] === threadId) active[target.lessonId] = null;
      return { threads: s.threads.filter((t) => t.id !== threadId), activeThreadByLesson: active };
    });
    persistThreads(get().threads);
    persistActive(get().activeThreadByLesson);
  },

  clearAllHistory: () => {
    set(() => ({ threads: [], activeThreadByLesson: {} }));
    persistThreads(get().threads);
    persistActive(get().activeThreadByLesson);
  },
}));

// A stable, shared reference for "no messages yet". Returning a fresh `[]`
// literal from a selector would give React a new array identity on every call
// even when nothing changed, which — under zustand's useSyncExternalStore-based
// subscriptions — triggers an infinite render loop (React error #185).
const EMPTY_MESSAGES: ChatMessage[] = [];

/** Messages of the chat currently open for this lesson (stable reference — safe as a selector result). */
export function selectMessages(lessonId: string | undefined) {
  return (s: ChatState): ChatMessage[] => {
    if (!lessonId) return EMPTY_MESSAGES;
    return activeThreadOf(s, lessonId)?.messages ?? EMPTY_MESSAGES;
  };
}

export function selectActiveThreadId(lessonId: string | undefined) {
  return (s: ChatState): string | null => (lessonId ? (activeThreadOf(s, lessonId)?.id ?? null) : null);
}
