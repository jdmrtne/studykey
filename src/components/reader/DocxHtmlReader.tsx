import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { loadProgress, saveProgress } from "../../lib/reader/progress";
import { paginateHtml } from "../../lib/reader/paginateHtml";
import { IconButton, ProgressBar, ReaderNotice, SegmentedToggle } from "./ReaderParts";

type Mode = "scroll" | "pages";

function PageCard({ index, html }: { index: number; html: string }) {
  return (
    <section
      aria-label={`Page ${index}`}
      className="rounded-2xl border border-ink-3 bg-ink-2 p-5 md:p-7 memora-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Web preview of a Word document. HTML is sanitized upstream (see resolveRenderer). */
export function DocxHtmlReader({ html, lessonId }: { html: string; lessonId: string }) {
  const pages = useMemo(() => paginateHtml(html), [html]);
  const total = pages.length;
  const [mode, setMode] = useState<Mode>("scroll");
  const [current, setCurrent] = useState(() => Math.min(loadProgress(lessonId), total || 1));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => saveProgress(lessonId, current), [lessonId, current]);

  const go = (n: number) => {
    const next = Math.max(1, Math.min(total, n));
    setCurrent(next);
    if (mode === "scroll") cardRefs.current[next - 1]?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  useEffect(() => {
    if (mode === "scroll") cardRefs.current[current - 1]?.scrollIntoView({ block: "start" });
    // only when switching modes / first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (total === 0) {
    return (
      <>
        <ReaderNotice title="Content Preview">This is a web preview. Some Word formatting may appear differently.</ReaderNotice>
        <p className="p-6 text-sm text-paper/45">This document has no text to display.</p>
      </>
    );
  }

  return (
    <>
      <ReaderNotice title="Content Preview">This is a web preview. Some Word formatting may appear differently.</ReaderNotice>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ink-3 bg-ink-2/60 flex-shrink-0">
        <SegmentedToggle
          label="Reading mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "scroll", label: "Scroll" },
            { value: "pages", label: "Page by page" },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Previous page" onClick={() => go(current - 1)} disabled={current <= 1}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <span className="text-sm font-semibold tabular-nums min-w-[4rem] text-center" aria-live="polite">
            {current} / {total}
          </span>
          <IconButton label="Next page" onClick={() => go(current + 1)} disabled={current >= total}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
        </div>
      </div>
      <ProgressBar value={total > 1 ? (current - 1) / (total - 1) : 1} />

      {mode === "scroll" ? (
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 py-5"
          onScroll={(e) => {
            const top = e.currentTarget.getBoundingClientRect().top;
            let idx = 0;
            cardRefs.current.forEach((el, i) => {
              if (el && el.getBoundingClientRect().top - top < e.currentTarget.clientHeight * 0.4) idx = i;
            });
            setCurrent(idx + 1);
          }}
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {pages.map((p, i) => (
              <div key={i} ref={(el) => void (cardRefs.current[i] = el)}>
                <PageCard index={i + 1} html={p} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 py-5 outline-none"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(current + 1);
            if (e.key === "ArrowLeft") go(current - 1);
          }}
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
          }}
        >
          <div className="max-w-3xl mx-auto">
            <PageCard index={current} html={pages[current - 1]} />
          </div>
        </div>
      )}
    </>
  );
}
