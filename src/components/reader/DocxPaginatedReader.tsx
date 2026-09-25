import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DocxPageSetup } from "../../lib/docx/docxPageSetup";
import { paginateDocxHtml } from "../../lib/docx/paginateDocx";
import { loadProgress, saveProgress } from "../../lib/reader/progress";
import { IconButton, ProgressBar, ReaderLoading, ReaderNotice, SegmentedToggle } from "./ReaderParts";

type Mode = "scroll" | "swipe";

/**
 * One document page, rendered at its true DOCX size (in CSS px @ 96dpi) and
 * visually resized with `zoom` rather than `transform: scale`, since `zoom`
 * actually changes the box's layout size — the scroll container reserves
 * the right amount of space at any zoom level, and pages never overlap.
 * Only mounts its HTML while near the viewport (an off-screen placeholder
 * reserves the same footprint), so a 50+ page document doesn't shove
 * thousands of DOM nodes into the page all at once.
 */
function DocxPage({
  html,
  pageNumber,
  setup,
  scale,
  eager,
  showLabel = true,
}: {
  html: string;
  pageNumber: number;
  setup: DocxPageSetup;
  scale: number;
  eager?: boolean;
  showLabel?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!!eager);

  useEffect(() => {
    if (eager) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  const contentHeight = setup.heightPx - setup.marginTopPx - setup.marginBottomPx;

  return (
    <div ref={wrapRef} className="flex flex-col items-center flex-shrink-0">
      <div
        className="bg-white shadow-md"
        style={
          {
            width: setup.widthPx,
            minHeight: setup.heightPx,
            paddingTop: setup.marginTopPx,
            paddingRight: setup.marginRightPx,
            paddingBottom: setup.marginBottomPx,
            paddingLeft: setup.marginLeftPx,
            boxSizing: "border-box",
            color: "#1c1c1e",
            zoom: scale,
          } as React.CSSProperties
        }
      >
        {visible ? (
          <div className="memora-prose" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div aria-hidden="true" style={{ minHeight: contentHeight }} />
        )}
      </div>
      {showLabel && (
        <span className="text-[11px] text-paper/40 mt-1.5 mb-1 select-none tabular-nums" aria-hidden="true">
          {pageNumber}
        </span>
      )}
    </div>
  );
}

interface Props {
  html: string;
  pageSetup: DocxPageSetup;
  lessonId: string;
  /** Pagination itself failed (or produced nothing) — the caller should fall back to the plain scrolling HTML view. */
  onFallback: () => void;
}

export function DocxPaginatedReader({ html, pageSetup, lessonId, onFallback }: Props) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [mode, setMode] = useState<Mode>("scroll");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showThumbs, setShowThumbs] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  const total = pages?.length ?? 0;

  // ---- lay out pages (real measurement, not character counting — see paginateDocx.ts) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await paginateDocxHtml(html, pageSetup);
        if (cancelled) return;
        if (!result.length) throw new Error("DOCX pagination produced no pages");
        setPages(result);
        setPage(Math.min(loadProgress(lessonId), result.length));
      } catch (e) {
        console.error("Memora: DOCX pagination failed, falling back to plain HTML view", e);
        if (!cancelled) fallbackRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [html, pageSetup, lessonId]);

  // ---- measure the reading area (drives fit-to-width / fit-both zoom) ----
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [pages, showThumbs]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (pages) saveProgress(lessonId, page);
  }, [pages, lessonId, page]);

  // ---- sizing ----
  const fitW = box.w ? (box.w - 24) / pageSetup.widthPx : 1;
  const fitBoth = box.w && box.h ? Math.min((box.w - 24) / pageSetup.widthPx, (box.h - 24) / pageSetup.heightPx) : 1;
  const scale = Math.max(0.2, (mode === "swipe" ? fitBoth : fitW) * zoom);
  const thumbScale = 96 / pageSetup.widthPx;

  const goTo = useCallback(
    (n: number, smooth = false) => {
      if (!total) return;
      const next = Math.max(1, Math.min(total, n));
      setPage(next);
      if (mode === "scroll") pageEls.current[next - 1]?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
      else areaRef.current?.scrollTo({ top: 0, left: 0 });
    },
    [mode, total]
  );

  // Restore position after load / mode switch.
  useEffect(() => {
    if (!pages || mode !== "scroll") return;
    const id = requestAnimationFrame(() => pageEls.current[page - 1]?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, mode]);

  const onScroll = () => {
    if (mode !== "scroll") return;
    const area = areaRef.current;
    if (!area) return;
    const top = area.getBoundingClientRect().top;
    let idx = 0;
    pageEls.current.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top - top < area.clientHeight * 0.35) idx = i;
    });
    setPage(idx + 1);
  };

  // ---- search: the whole document's text is already in memory, so this is instant, no lazy extraction needed ----
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ page: number; count: number }[] | null>(null);
  const [hitIdx, setHitIdx] = useState(0);
  const pageTexts = useRef<string[]>([]);

  useEffect(() => {
    if (!pages) return;
    pageTexts.current = pages.map((h) => {
      const el = document.createElement("div");
      el.innerHTML = h;
      return (el.textContent || "").toLowerCase();
    });
    setHits(null);
  }, [pages]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found: { page: number; count: number }[] = [];
    pageTexts.current.forEach((text, i) => {
      let count = 0;
      for (let idx = text.indexOf(q); idx !== -1; idx = text.indexOf(q, idx + q.length)) count++;
      if (count) found.push({ page: i + 1, count });
    });
    setHits(found);
    setHitIdx(0);
    if (found.length) goTo(found[0].page);
  }
  const stepHit = (d: number) => {
    if (!hits?.length) return;
    const i = (hitIdx + d + hits.length) % hits.length;
    setHitIdx(i);
    goTo(hits[i].page);
  };

  // ---- fullscreen ----
  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  if (!pages) return <ReaderLoading label="Laying out your document…" />;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex-1 min-h-0 flex flex-col bg-ink outline-none"
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        if (mode === "swipe" && (e.key === "ArrowRight" || e.key === "PageDown")) goTo(page + 1);
        if (mode === "swipe" && (e.key === "ArrowLeft" || e.key === "PageUp")) goTo(page - 1);
      }}
    >
      <ReaderNotice>
        This is a web preview — page layout, tables, images, headings and lists are preserved, but some direct
        formatting (custom colors, exact spacing) may look slightly different from the original.
      </ReaderNotice>

      {/* toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-ink-3 bg-ink-2/70 flex-shrink-0 flex-wrap">
        <IconButton label="Thumbnails" active={showThumbs} onClick={() => setShowThumbs((v) => !v)}>
          <LayoutGrid className="w-5 h-5" />
        </IconButton>
        <SegmentedToggle
          label="Reading mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "scroll", label: "Scroll" },
            { value: "swipe", label: "Swipe" },
          ]}
        />
        <div className="flex items-center ml-auto sm:ml-2">
          <IconButton label="Previous page" onClick={() => goTo(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <span
            className="text-sm font-semibold tabular-nums min-w-[4rem] text-center"
            aria-live="polite"
            aria-label={`Page ${page} of ${total}`}
          >
            {page} / {total}
          </span>
          <IconButton label="Next page" onClick={() => goTo(page + 1)} disabled={page >= total}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="flex items-center sm:ml-auto">
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={zoom <= 0.5}>
            <ZoomOut className="w-5 h-5" />
          </IconButton>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset zoom to fit"
            className="hidden sm:block text-xs font-semibold tabular-nums w-12 min-h-[2.5rem] text-paper/70 hover:text-paper"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} disabled={zoom >= 2}>
            <ZoomIn className="w-5 h-5" />
          </IconButton>
          <IconButton label="Search in document" active={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
            <Search className="w-5 h-5" />
          </IconButton>
          {canFullscreen && (
            <IconButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </IconButton>
          )}
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={runSearch} className="flex items-center gap-2 px-3 py-2 border-b border-ink-3 bg-ink-2/40 flex-shrink-0">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this document"
            aria-label="Search this document"
            className="flex-1 min-w-0 rounded-full border-2 border-ink-3 bg-ink px-4 py-1.5 text-sm outline-none focus:border-signal"
          />
          <span className="text-xs text-paper/60 whitespace-nowrap" aria-live="polite">
            {hits ? (hits.length ? `${hitIdx + 1}/${hits.length} pages · ${hits.reduce((n, h) => n + h.count, 0)} matches` : "No matches") : ""}
          </span>
          <IconButton label="Previous result" onClick={() => stepHit(-1)} disabled={!hits?.length}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <IconButton label="Next result" onClick={() => stepHit(1)} disabled={!hits?.length}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
          <IconButton label="Close search" onClick={() => setSearchOpen(false)}>
            <X className="w-5 h-5" />
          </IconButton>
        </form>
      )}

      <ProgressBar value={total > 1 ? (page - 1) / (total - 1) : 1} />

      <div className="flex-1 min-h-0 flex relative">
        {showThumbs && (
          <aside aria-label="Thumbnails" className="w-32 flex-shrink-0 overflow-y-auto border-r border-ink-3 bg-ink-2 p-2 flex flex-col gap-3 z-10">
            {pages.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i + 1)}
                aria-label={`Go to page ${i + 1}`}
                aria-current={i + 1 === page}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 ${i + 1 === page ? "bg-signal/15 ring-2 ring-signal" : "hover:bg-ink-3/60"}`}
              >
                <DocxPage html={h} pageNumber={i + 1} setup={pageSetup} scale={thumbScale} showLabel={false} />
                <span className="text-[11px] text-paper/60 tabular-nums">{i + 1}</span>
              </button>
            ))}
          </aside>
        )}

        <div
          ref={areaRef}
          onScroll={onScroll}
          className="flex-1 min-w-0 overflow-auto bg-ink-3/30 py-4"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s || mode !== "swipe") return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(page + (dx < 0 ? 1 : -1));
          }}
        >
          {mode === "scroll" ? (
            <div className="flex flex-col gap-5 items-center w-max min-w-full px-3">
              {pages.map((h, i) => (
                <div key={i} ref={(el) => void (pageEls.current[i] = el)} data-page={i + 1}>
                  <DocxPage html={h} pageNumber={i + 1} setup={pageSetup} scale={scale} eager={i < 2} />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-max min-w-full flex justify-center px-3">
              <DocxPage key={page} html={pages[page - 1]} pageNumber={page} setup={pageSetup} scale={scale} eager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
