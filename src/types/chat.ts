export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Section headings of the lesson chunks used to ground this answer, if any (assistant messages only). */
  sources?: string[];
  /** True while this assistant message is still streaming/loading. */
  pending?: boolean;
  /** Set if generation failed — content holds the last known text (usually empty) and error the message to show. */
  error?: string;
}

/** One saved conversation. A lesson can have many; the newest activity sorts first in the history list. */
export interface ChatThread {
  id: string;
  lessonId: string;
  /** Auto-generated from the first question the student asked. */
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
