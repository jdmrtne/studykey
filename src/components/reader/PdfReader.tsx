import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
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
import { loadProgress, saveProgress } from "../../lib/reader/progress";
import { IconButton, ProgressBar, ReaderLoading, SegmentedToggle } from "./ReaderParts";

type Mode = "scroll" | "swipe";
interface Est {
  w: number;
  h: number;
}

/** One PDF page. Only rasterized while near the viewport; the canvas is released when far away. */
function PdfPage({ doc, pageNumber, scale, est, eager }: { doc: PDFDocumentProxy; pageNumber: number; scale: number; est: Est; eager?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(!!eager);
  const [size, setSize] = useState<Est | null>(null);

  useEffect(() => {
    if (eager) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "700px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const vp = page.getViewport({ scale });
        setSize({ w: vp.width, h: vp.height });
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!visible) {
          canvas.width = 0; // free the bitmap for pages that are far away
          canvas.height = 0;
          return;
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;
        task = page.render({ canvas, canvasContext: ctx, viewport: page.getViewport({ scale: scale * dpr }) });
        await task.promise;
      } catch (e) {
        if ((e as Error)?.name !== "RenderingCancelledException") console.error("Memora: page render failed", e);
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, scale, visible]);

  const w = size?.w ?? est.w * scale;
  const h = size?.h ?? est.h * scale;
  return (
    <div ref={wrapRef} className="bg-white shadow-md mx-auto flex-shrink-0" style={{ width: w, height: h }}>
      <canvas ref={canvasRef} role="img" aria-label={`Page ${pageNumber}`} className="block" />
    </div>
  );
}

interface Props {
  data: ArrayBuffer;
  lessonId: string;
  /** "Slide" for converted presentations, "Page" otherwise. */
  unit?: "Page" | "Slide";
  onError: () => void;
}

export function PdfReader({ data, lessonId, unit = "Page", onError }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [first, setFirst] = useState<Est | null>(null);
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
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const total = doc?.numPages ?? 0;

  // ---- load document ----
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const [pdfjs, { default: workerUrl }] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        // pdf.js transfers (detaches) the buffer it is given, so hand it a copy.
        const t = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
        task = t;
        loaded = await t.promise;
        if (cancelled) return void t.destroy();
        const p1 = await loaded.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
        setFirst({ w: vp.width, h: vp.height });
        setPage(Math.min(loadProgress(lessonId), loaded.numPages));
        setDoc(loaded);
      } catch (e) {
        console.error("Memora: PDF load failed", e);
        if (!cancelled) errorRef.current();
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [data, lessonId]);

  // ---- measure the reading area ----
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [doc, showThumbs]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (doc) saveProgress(lessonId, page);
  }, [doc, lessonId, page]);

  // ---- sizing ----
  const fitW = first && box.w ? (box.w - 24) / first.w : 1;
  const fitBoth = first && box.w && box.h ? Math.min((box.w - 24) / first.w, (box.h - 24) / first.h) : 1;
  const scale = Math.max(0.2, (mode === "swipe" ? fitBoth : fitW) * zoom);
  const thumbScale = first ? 96 / first.w : 0.2;

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
    if (!doc || mode !== "scroll") return;
    const id = requestAnimationFrame(() => pageEls.current[page - 1]?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, mode]);

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

  // ---- search (text layer content; jumps between pages that contain matches) ----
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ page: number; count: number }[] | null>(null);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const textCache = useRef(new Map<number, string>());
  const searchToken = useRef(0);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!doc || !q) return;
    const token = ++searchToken.current;
    setSearching(true);
    const found: { page: number; count: number }[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      let text = textCache.current.get(p);
      if (text === undefined) {
        const content = await (await doc.getPage(p)).getTextContent();
        text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ").toLowerCase();
        textCache.current.set(p, text);
      }
      if (token !== searchToken.current) return;
      let count = 0;
      for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + q.length)) count++;
      if (count) found.push({ page: p, count });
    }
    setSearching(false);
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

  if (!doc || !first) return <ReaderLoading />;

  const canSwipe = mode === "swipe" && areaRef.current ? areaRef.current.scrollWidth <= areaRef.current.clientWidth + 2 : true;

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
          <IconButton label={`Previous ${unit.toLowerCase()}`} onClick={() => goTo(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <span className="text-sm font-semibold tabular-nums min-w-[4rem] text-center" aria-live="polite" aria-label={`${unit} ${page} of ${total}`}>
            {page} / {total}
          </span>
          <IconButton label={`Next ${unit.toLowerCase()}`} onClick={() => goTo(page + 1)} disabled={page >= total}>
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
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3}>
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
            {searching
              ? "Searching…"
              : hits
                ? hits.length
                  ? `${hitIdx + 1}/${hits.length} ${unit.toLowerCase()}s · ${hits.reduce((n, h) => n + h.count, 0)} matches`
                  : "No matches"
                : ""}
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
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => goTo(n)}
                aria-label={`Go to ${unit.toLowerCase()} ${n}`}
                aria-current={n === page}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 ${n === page ? "bg-signal/15 ring-2 ring-signal" : "hover:bg-ink-3/60"}`}
              >
                <PdfPage doc={doc} pageNumber={n} scale={thumbScale} est={first} />
                <span className="text-[11px] text-paper/60 tabular-nums">{n}</span>
              </button>
            ))}
          </aside>
        )}

        <div
          ref={areaRef}
          onScroll={onScroll}
          className="flex-1 min-w-0 overflow-auto bg-ink-3/30 py-3"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s || mode !== "swipe" || !canSwipe) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(page + (dx < 0 ? 1 : -1));
          }}
        >
          {mode === "scroll" ? (
            <div className="flex flex-col gap-3 items-center w-max min-w-full px-3">
              {Array.from({ length: total }, (_, i) => (
                <div key={i} ref={(el) => void (pageEls.current[i] = el)} data-page={i + 1}>
                  <PdfPage doc={doc} pageNumber={i + 1} scale={scale} est={first} />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-max min-w-full flex justify-center px-3">
              <PdfPage key={page} doc={doc} pageNumber={page} scale={scale} est={first} eager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
