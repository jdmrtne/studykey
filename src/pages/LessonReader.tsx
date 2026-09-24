import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { useLessonsStore } from "../store/lessonsStore";
import { getOriginal } from "../lib/fileStore";
import { detectKind, resolveRenderer, type ReaderSource } from "../lib/reader/resolveRenderer";
import { PdfReader } from "../components/reader/PdfReader";
import { DocxHtmlReader } from "../components/reader/DocxHtmlReader";
import { PptxSlidesReader } from "../components/reader/PptxSlidesReader";
import { TextReader } from "../components/reader/TextReader";
import { ReaderError, ReaderLoading, ReaderNotice } from "../components/reader/ReaderParts";

type Original = { blob: Blob; name: string };

function statusLabel(s: ReaderSource | null): string {
  if (!s) return "";
  switch (s.mode) {
    case "pdf":
      return s.converted ? "Document preview" : "Original document";
    case "docx-html":
      return "Web preview";
    case "pptx-slides":
      return "Content preview";
    case "text":
      return s.reason === "plain" ? "" : "Text preview";
    default:
      return "";
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LessonReader() {
  const { id = "" } = useParams();
  const lesson = useLessonsStore((s) => s.lessons.find((l) => l.id === id));
  const [original, setOriginal] = useState<Original | null>(null);
  const [source, setSource] = useState<ReaderSource | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!lesson) return;
    let cancelled = false;
    setSource(null);
    (async () => {
      const orig = await getOriginal(lesson.id);
      if (cancelled) return;
      setOriginal(orig);
      const resolved = await resolveRenderer(lesson, orig);
      if (!cancelled) setSource(resolved);
    })().catch((e) => {
      console.error("Memora: reader failed", e);
      if (!cancelled) setSource({ mode: "failed", kind: detectKind(lesson.sourceFileName) });
    });
    return () => {
      cancelled = true;
    };
    // re-run on retry; lesson identity is enough otherwise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, attempt]);

  // A PDF that fails to open falls through to the next tier instead of leaving a blank page.
  const onPdfError = useCallback(async () => {
    if (!lesson) return;
    const kind = detectKind(lesson.sourceFileName);
    if (kind !== "pdf") {
      setSource(await resolveRenderer(lesson, original, { skipServer: true }));
    } else if (lesson.rawText.trim()) {
      setSource({ mode: "text", text: lesson.rawText, reason: "pdf-fallback" });
    } else {
      setSource({ mode: "failed", kind });
    }
  }, [lesson, original]);

  if (!lesson) {
    return (
      <div className="p-6 flex flex-col gap-3 items-start">
        <p className="text-sm text-paper/70">That lesson couldn’t be found.</p>
        <Link to="/lessons" className="text-signal font-semibold text-sm hover:underline">
          Back to Lessons
        </Link>
      </div>
    );
  }

  const kind = detectKind(lesson.sourceFileName);
  const canDownload = !!original;
  const label = statusLabel(source);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-3 md:px-6 py-2 border-b border-ink-3 flex-shrink-0">
        <Link
          to="/lessons"
          aria-label="Back to Lessons"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-paper/70 hover:text-paper hover:bg-ink-3/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-semibold text-sm md:text-base truncate">{lesson.title}</h1>
          {label && <p className="text-[11px] text-paper/50">{label}</p>}
        </div>
        {canDownload && kind !== "text" && (
          <button
            type="button"
            onClick={() => original && downloadBlob(original.blob, original.name)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink-3 px-3.5 min-h-[2.5rem] text-xs font-semibold hover:border-signal/50 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Download Original</span>
            <span className="sm:hidden">Original</span>
          </button>
        )}
      </div>

      {!source && <ReaderLoading />}

      {source?.mode === "pdf" && (
        <PdfReader
          data={source.data}
          lessonId={lesson.id}
          unit={kind === "pptx" ? "Slide" : "Page"}
          onError={onPdfError}
        />
      )}
      {source?.mode === "docx-html" && <DocxHtmlReader html={source.html} />}
      {source?.mode === "pptx-slides" && <PptxSlidesReader slides={source.slides} lessonId={lesson.id} />}
      {source?.mode === "text" && (
        <>
          {source.reason === "docx-fallback" && (
            <ReaderNotice title="Preview mode">
              Some formatting could not be reproduced, but the document text is available to read.
            </ReaderNotice>
          )}
          {source.reason === "pdf-fallback" && (
            <ReaderNotice title="Text preview">The document layout is not available.</ReaderNotice>
          )}
          {source.reason === "no-original" && kind !== "text" && (
            <ReaderNotice title="Text preview">
              The original file isn’t saved on this device, so only the lesson text is shown.
            </ReaderNotice>
          )}
          <TextReader text={source.text} />
        </>
      )}
      {source?.mode === "failed" && (
        <ReaderError
          kind={source.kind}
          canDownload={canDownload}
          onDownload={() => original && downloadBlob(original.blob, original.name)}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}
    </div>
  );
}
