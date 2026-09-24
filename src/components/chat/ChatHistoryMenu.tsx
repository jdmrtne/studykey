import { BookMarked, MessageSquare, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { ChatThread } from "../../types/chat";

interface Props {
  /** Every saved chat, across all lessons, newest activity first. */
  threads: ChatThread[];
  /** Lesson id -> title, for labeling each chat. A lesson missing from this map has been deleted. */
  lessonTitles: Record<string, string>;
  activeId: string | null;
  onNew: () => void;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onClearAll: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatHistoryMenu({ threads, lessonTitles, activeId, onNew, onOpen, onDelete, onClearAll }: Props) {
  return (
    <div className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink-3 bg-ink-2 shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <p className="text-sm font-display font-semibold">Chat history</p>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline px-1.5 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="px-4 pb-5 pt-2 text-sm text-paper/50">
          No saved chats yet. Ask a question and it'll show up here.
        </p>
      ) : (
        <ul className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain px-2 pb-2 flex flex-col gap-0.5">
          {threads.map((t) => {
            const isActive = t.id === activeId;
            const lessonTitle = lessonTitles[t.lessonId];
            const lessonGone = lessonTitle === undefined;
            return (
              <li key={t.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  disabled={lessonGone}
                  title={lessonGone ? "This chat's lesson was deleted, so it can't be reopened" : undefined}
                  className={clsx(
                    "w-full text-left flex items-start gap-2.5 rounded-xl pl-3 pr-10 py-2.5 transition-colors",
                    isActive ? "bg-signal/15" : "hover:bg-ink-3/60",
                    lessonGone && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <MessageSquare
                    className={clsx("w-4 h-4 mt-0.5 flex-shrink-0", isActive ? "text-signal" : "text-paper/40")}
                  />
                  <span className="min-w-0">
                    <span className={clsx("block text-sm truncate", isActive ? "font-semibold text-signal" : "text-paper/90")}>
                      {t.title}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-paper/60 mt-0.5 min-w-0">
                      <BookMarked className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lessonGone ? "Lesson deleted" : lessonTitle}</span>
                    </span>
                    <span className="block text-[11px] text-paper/40 mt-0.5">
                      {timeAgo(t.updatedAt)} · {t.messages.length} message{t.messages.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  aria-label={`Delete chat: ${t.title}`}
                  title="Delete this chat"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-paper/40 hover:text-danger hover:bg-danger/10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {threads.length > 0 && (
        <div className="border-t border-ink-3 px-4 py-2">
          <button type="button" onClick={onClearAll} className="text-xs text-danger/80 hover:text-danger py-1">
            Delete all chats
          </button>
        </div>
      )}
    </div>
  );
}
