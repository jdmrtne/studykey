import { BookMarked, FileText, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { SavedReviewer } from "../../store/reviewerStore";

interface Props {
  /** Every saved reviewer, newest first. */
  items: SavedReviewer[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ReviewerHistoryMenu({ items, activeId, onOpen, onDelete, onClearAll }: Props) {
  return (
    <div className="w-full rounded-2xl border border-ink-3 bg-ink-2 shadow-2xl overflow-hidden flex flex-col">
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-display font-semibold">Saved reviewers</p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 pb-5 pt-2 text-sm text-paper/50">
          Nothing saved yet. Generate a reviewer and it'll be saved here automatically.
        </p>
      ) : (
        <ul className="max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain px-2 pb-2 flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const total = item.reviewer.sections.length;
            const done = item.reviewedSections.filter((n) => n >= 0 && n < total).length;
            return (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className={clsx(
                    "w-full text-left flex items-start gap-2.5 rounded-xl pl-3 pr-10 py-2.5 transition-colors",
                    isActive ? "bg-signal/15" : "hover:bg-ink-3/60"
                  )}
                >
                  <FileText className={clsx("w-4 h-4 mt-0.5 flex-shrink-0", isActive ? "text-signal" : "text-paper/40")} />
                  <span className="min-w-0">
                    <span
                      className={clsx("flex items-center gap-1 text-sm min-w-0", isActive ? "font-semibold text-signal" : "text-paper/90")}
                    >
                      <BookMarked className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                      <span className="truncate">{item.lessonTitle}</span>
                    </span>
                    <span className="block text-[11px] text-paper/45 mt-0.5">{formatWhen(item.createdAt)}</span>
                    <span className="block text-[11px] text-paper/40">
                      {total} section{total === 1 ? "" : "s"} · {done}/{total} reviewed
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Delete reviewer for ${item.lessonTitle}`}
                  title="Delete this reviewer"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-paper/40 hover:text-danger hover:bg-danger/10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="border-t border-ink-3 px-4 py-2">
          <button type="button" onClick={onClearAll} className="text-xs text-danger/80 hover:text-danger py-1">
            Delete all saved reviewers
          </button>
        </div>
      )}
    </div>
  );
}
