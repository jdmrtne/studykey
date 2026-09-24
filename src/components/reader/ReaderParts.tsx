import { Info, Loader2, FileWarning, Download, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import type { ReactNode } from "react";
import type { FileKind } from "../../lib/reader/resolveRenderer";

export function ReaderNotice({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-2.5 px-4 py-2 text-xs bg-signal/10 border-b border-ink-3 text-paper/75">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-signal" aria-hidden="true" />
      <p>
        {title && <span className="font-semibold text-paper/90">{title} · </span>}
        {children}
      </p>
    </div>
  );
}

export function ReaderLoading({ label = "Preparing your lesson for reading…" }: { label?: string }) {
  return (
    <div role="status" className="flex-1 flex flex-col items-center justify-center gap-3 text-paper/60 text-sm p-8">
      <Loader2 className="w-6 h-6 animate-spin text-signal" aria-hidden="true" />
      {label}
    </div>
  );
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-ink-3 bg-ink p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "px-3 min-h-[2.25rem] rounded-full text-xs font-semibold transition-colors touch-manipulation",
            value === o.value ? "bg-signal text-night" : "text-paper/65 hover:text-paper"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation disabled:opacity-30",
        active ? "bg-signal/15 text-signal" : "text-paper/70 hover:text-paper hover:bg-ink-3/60"
      )}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      className="h-1 bg-ink-3 flex-shrink-0"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="h-full bg-signal transition-[width] duration-150" style={{ width: `${pct}%` }} />
    </div>
  );
}

const KIND_NAME: Record<FileKind, string> = {
  pdf: "PDF",
  docx: "Word document",
  pptx: "PowerPoint",
  text: "lesson",
};

export function ReaderError({
  kind,
  canDownload,
  onDownload,
  onRetry,
}: {
  kind: FileKind;
  canDownload: boolean;
  onDownload: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-amber/15 text-amber flex items-center justify-center">
          <FileWarning className="w-6 h-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display font-bold text-lg">This {KIND_NAME[kind]} can’t be previewed</h2>
          <p className="text-sm text-paper/60 mt-1">We couldn’t display this document inside Memora.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {canDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-signal text-night px-5 min-h-[2.75rem] text-sm font-semibold hover:bg-signal-dim transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" /> Download Original
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink-3 px-5 min-h-[2.75rem] text-sm font-semibold hover:border-signal/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try Again
          </button>
          <Link
            to="/lessons"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink-3 px-5 min-h-[2.75rem] text-sm font-semibold hover:border-signal/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Lessons
          </Link>
        </div>
      </div>
    </div>
  );
}
