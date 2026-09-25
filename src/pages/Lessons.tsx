import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { saveOriginal } from "../lib/fileStore";
import clsx from "clsx";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useLessonsStore } from "../store/lessonsStore";
import { buildLessonFromFile, buildLessonFromText, estimateTokens, type ExtractProgress } from "../lib/documentPipeline";
import {
  Upload,
  FileText,
  FileType,
  ClipboardPaste,
  Trash2,
  Layers,
  Loader2,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

type AddMode = "upload" | "paste";

function fileKind(sourceFileName: string | undefined): { label: string; icon: typeof FileText } {
  if (!sourceFileName) return { label: "Pasted text", icon: ClipboardPaste };
  const name = sourceFileName.toLowerCase();
  if (name.endsWith(".pdf")) return { label: "PDF", icon: FileType };
  if (name.endsWith(".docx")) return { label: "Word", icon: FileType };
  if (name.endsWith(".pptx")) return { label: "PowerPoint", icon: FileType };
  return { label: "Text", icon: FileText };
}

function extractingLabel(fileName: string, ocr: ExtractProgress | null): string {
  if (!ocr) return `Reading ${fileName}...`;
  if (ocr.status === "loading") return "No text layer found — starting OCR...";
  return `Running OCR on page ${ocr.page} of ${ocr.totalPages}...`;
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function Lessons() {
  const { lessons, addLesson, removeLesson, selectedLessonId, selectLesson } = useLessonsStore();
  const [mode, setMode] = useState<AddMode>("upload");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<ExtractProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setExtracting(file.name);
    setOcrStatus(null);
    try {
      const lesson = await buildLessonFromFile(file, undefined, setOcrStatus);
      await saveOriginal(lesson.id, file); // keep the original so it can be read and downloaded later
      addLesson(lesson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setExtracting(null);
      setOcrStatus(null);
    }
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    const lesson = buildLessonFromText(pasteTitle.trim() || "Pasted lesson", pasteText);
    addLesson(lesson);
    setPasteTitle("");
    setPasteText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Lessons</h1>
        <p className="text-paper/60 text-sm mt-1">
          Turn your lesson into a study experience. Long lessons are automatically split into chunks so generation and Chat stay
          within your model's context window.
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-1 p-1 rounded-full bg-ink border border-ink-3 self-start">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={clsx(
              "px-4 py-2.5 rounded-full text-sm font-semibold transition-colors touch-manipulation",
              mode === "upload" ? "bg-signal text-night" : "text-paper/60 hover:text-paper"
            )}
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={clsx(
              "px-4 py-2.5 rounded-full text-sm font-semibold transition-colors touch-manipulation",
              mode === "paste" ? "bg-signal text-night" : "text-paper/60 hover:text-paper"
            )}
          >
            Paste text
          </button>
        </div>

        {mode === "upload" ? (
          <div className="flex flex-col gap-3">
            <div
              className="border-2 border-dashed border-ink-3 rounded-2xl p-6 sm:p-10 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-signal/60 hover:bg-signal/5 transition-colors touch-manipulation"
              onClick={() => !extracting && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && !extracting) handleFile(file);
              }}
            >
              {extracting ? (
                <>
                  <Loader2 className="w-7 h-7 text-signal animate-spin" />
                  <p className="text-sm text-paper/60">{extractingLabel(extracting, ocrStatus)}</p>
                  {ocrStatus?.status === "recognizing" && (
                    <div className="w-full max-w-xs h-1.5 rounded-full bg-ink-3 overflow-hidden">
                      <div
                        className="h-full bg-signal transition-[width] duration-150"
                        style={{
                          width: `${Math.round(
                            (((ocrStatus.page - 1 + ocrStatus.pageProgress) / ocrStatus.totalPages) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="w-12 h-12 rounded-2xl bg-signal/10 text-signal flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </span>
                  <p className="text-sm font-semibold text-paper/80">Drop a lesson file here, or click to browse</p>
                  <p className="text-xs text-paper/40">Supports .txt, .md, .pdf, .docx, and .pptx</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.pdf,.docx,.pptx"
                className="hidden"
                disabled={!!extracting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-paper/40">
              Scanned/image-only PDFs are read with on-device OCR automatically (slower, and needs an internet
              connection the first time). Old .doc and .ppt files need to be re-saved as .docx / .pptx first.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <TextField
              label="Title"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Electrical Safety"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-paper/80">Lesson text</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                className="w-full rounded-2xl border-2 border-ink-3 bg-ink px-4 py-3 text-sm text-paper placeholder:text-paper/30 outline-none focus:border-signal transition-colors"
                placeholder="Paste your lesson content here..."
              />
              {pasteText.trim() && <p className="text-xs text-paper/40">~{estimateTokens(pasteText)} tokens</p>}
            </div>
            <Button variant="primary" onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="w-full sm:w-auto sm:self-start">
              Add Lesson
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-display font-semibold text-sm text-paper/80">Your lessons ({lessons.length})</h2>

        {lessons.length === 0 && (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-ink-3 flex items-center justify-center text-paper/40">
              <BookOpen className="w-5 h-5" />
            </span>
            <p className="text-sm text-paper/50">No lessons yet — upload a file or paste text above to create your first one.</p>
          </div>
        )}

        <div className="flex flex-col divide-y divide-ink-3">
          {lessons.map((lesson) => {
            const active = lesson.id === selectedLessonId;
            const { label: kindLabel, icon: KindIcon } = fileKind(lesson.sourceFileName);
            return (
              <div
                key={lesson.id}
                className={clsx(
                  "py-4 px-3 -mx-3 rounded-xl flex items-center gap-4 transition-colors",
                  active && "bg-signal/5"
                )}
              >
                <span
                  className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    active ? "bg-signal/15 text-signal" : "bg-ink-3 text-paper/60"
                  )}
                >
                  <KindIcon className="w-5 h-5" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{lesson.title}</p>
                    {active && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-signal flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-paper/40 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{kindLabel}</span>
                    <span aria-hidden="true">·</span>
                    <Layers className="w-3 h-3" /> {lesson.chunks.length} chunk{lesson.chunks.length === 1 ? "" : "s"}
                    <span aria-hidden="true">·</span>~{estimateTokens(lesson.rawText)} tokens
                    <span aria-hidden="true">·</span>
                    {timeAgo(lesson.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link
                    to={`/lessons/${lesson.id}/read`}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-3 px-3 min-h-[2.5rem] text-xs font-semibold hover:border-signal/50 transition-colors touch-manipulation"
                    aria-label={`Read ${lesson.title}`}
                  >
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Read
                  </Link>
                  {!active && (
                    <Button variant="ghost" size="md" onClick={() => selectLesson(lesson.id)} className="!px-3 !py-2 !text-xs">
                      Select
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLesson(lesson.id)}
                    className="text-paper/30 hover:text-danger transition-colors p-2 tap-target flex items-center justify-center touch-manipulation"
                    aria-label={`Remove ${lesson.title}`}
                    title="Remove lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
