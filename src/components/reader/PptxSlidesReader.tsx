import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SlideContent } from "../../lib/pptx";
import { loadProgress, saveProgress } from "../../lib/reader/progress";
import { IconButton, ProgressBar, ReaderNotice, SegmentedToggle } from "./ReaderParts";

type Mode = "scroll" | "slides";

function SlideCard({ slide }: { slide: SlideContent }) {
  return (
    <section aria-label={`Slide ${slide.index}`} className="rounded-2xl border border-ink-3 bg-ink-2 p-5 md:p-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-signal mb-2">Slide {slide.index}</p>
      {slide.title && <h2 className="font-display font-bold text-xl md:text-2xl mb-3">{slide.title}</h2>}
      <ul className="flex flex-col gap-2 text-[15px] leading-relaxed">
        {slide.lines.map((l, i) => (
          <li key={i} className="flex gap-2 whitespace-pre-line" style={{ paddingLeft: `${l.level * 1.25}rem` }}>
            {l.bullet && <span aria-hidden="true" className="text-paper/50">•</span>}
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
      {!slide.title && slide.lines.length === 0 && (
        <p className="text-sm text-paper/45">This slide has no text (it may contain only images or graphics).</p>
      )}
      {slide.notes && (
        <details className="mt-4 text-sm text-paper/70">
          <summary className="cursor-pointer font-semibold min-h-[2.25rem] flex items-center">Speaker notes</summary>
          <p className="whitespace-pre-line mt-1">{slide.notes}</p>
        </details>
      )}
    </section>
  );
}

/** Text-only fallback for PowerPoint files. Not a visual reproduction of the slides. */
export function PptxSlidesReader({ slides, lessonId }: { slides: SlideContent[]; lessonId: string }) {
  const total = slides.length;
  const [mode, setMode] = useState<Mode>("scroll");
  const [current, setCurrent] = useState(() => Math.min(loadProgress(lessonId), total));
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

  return (
    <>
      <ReaderNotice title="Content Preview">
        PowerPoint preview mode. Some slide design, graphics, animations, and positioning may not be reproduced.
      </ReaderNotice>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ink-3 bg-ink-2/60 flex-shrink-0">
        <SegmentedToggle
          label="Reading mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "scroll", label: "Scroll" },
            { value: "slides", label: "Slide by slide" },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Previous slide" onClick={() => go(current - 1)} disabled={current <= 1}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <span className="text-sm font-semibold tabular-nums min-w-[4rem] text-center" aria-live="polite">
            {current} / {total}
          </span>
          <IconButton label="Next slide" onClick={() => go(current + 1)} disabled={current >= total}>
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
            {slides.map((s, i) => (
              <div key={s.index} ref={(el) => void (cardRefs.current[i] = el)}>
                <SlideCard slide={s} />
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
            <SlideCard slide={slides[current - 1]} />
          </div>
        </div>
      )}
    </>
  );
}
