import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  EyeOff,
  Lightbulb,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import type { Reviewer, ReviewerSection, ReviewerTerm } from "../../types/study";

/* Each section gets its own accent so a long reviewer is easy to scan and navigate. Full class strings
   (not built dynamically) so Tailwind can see them. */
const ACCENTS = [
  { badge: "bg-signal/15 text-signal", bar: "bg-signal", chip: "border-signal/40 text-signal", dot: "bg-signal" },
  { badge: "bg-violet/15 text-violet", bar: "bg-violet", chip: "border-violet/40 text-violet", dot: "bg-violet" },
  { badge: "bg-mint/15 text-mint", bar: "bg-mint", chip: "border-mint/40 text-mint", dot: "bg-mint" },
  { badge: "bg-amber/15 text-amber", bar: "bg-amber", chip: "border-amber/40 text-amber", dot: "bg-amber" },
] as const;

// --- Defensive readers: AI output is validated loosely, so never trust the optional extras blindly. ---
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter(nonEmpty) : []);
const terms = (v: unknown): ReviewerTerm[] =>
  Array.isArray(v) ? v.filter((t): t is ReviewerTerm => !!t && nonEmpty(t.term) && nonEmpty(t.definition)) : [];

interface Props {
  reviewer: Reviewer;
  /** Sections already marked reviewed (restored from the saved reviewer). Only read on first render — remount via `key` to reset. */
  initialReviewed?: number[];
  /** Called whenever the reviewed set changes, so the caller can save progress. */
  onReviewedChange?: (sections: number[]) => void;
}

export function ReviewerView({ reviewer, initialReviewed, onReviewedChange }: Props) {
  const [reviewed, setReviewed] = useState<Set<number>>(
    () => new Set((initialReviewed ?? []).filter((n) => n >= 0 && n < reviewer.sections.length))
  );
  const [collapsed, setCollapsed] = useState<Set<number>>(
    () => new Set(reviewer.sections.map((_, i) => i))
  );

  const stats = useMemo(() => {
    let points = 0;
    let termCount = 0;
    for (const s of reviewer.sections) {
      points += strings(s.keyPoints).length;
      termCount += terms(s.keyTerms).length;
    }
    return { sections: reviewer.sections.length, points, terms: termCount };
  }, [reviewer]);

  const total = reviewer.sections.length;
  const progress = total === 0 ? 0 : Math.round((reviewed.size / total) * 100);
  const allCollapsed = collapsed.size === total && total > 0;

  function toggleCollapsed(i: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleReviewed(i: number) {
    const next = new Set(reviewed);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setReviewed(next);
    onReviewedChange?.([...next].sort((a, b) => a - b));
  }

  function jumpTo(i: number) {
    setCollapsed((prev) => {
      if (!prev.has(i)) return prev;
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
    document.getElementById(`reviewer-section-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const overview = nonEmpty(reviewer.overview) ? reviewer.overview : null;
  const mustKnow = strings(reviewer.mustKnow);

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-3 bg-ink-2 p-5 sm:p-6">
        <div
          className="absolute inset-0 opacity-[0.16] pointer-events-none"
          style={{ background: "linear-gradient(135deg, var(--color-signal), var(--color-violet))" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-2xl bg-signal text-night flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-paper/50">Study reviewer</p>
              <h2 className="text-xl sm:text-2xl font-display font-bold leading-tight break-words">{reviewer.title}</h2>
            </div>
          </div>

          {overview && <p className="text-sm text-paper/75 leading-relaxed">{overview}</p>}

          <div className="flex flex-wrap gap-2">
            <StatChip icon={<BookOpen className="w-3.5 h-3.5" />} label={`${stats.sections} sections`} />
            <StatChip icon={<ListChecks className="w-3.5 h-3.5" />} label={`${stats.points} key points`} />
            {stats.terms > 0 && <StatChip icon={<Brain className="w-3.5 h-3.5" />} label={`${stats.terms} terms`} />}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-paper/70">
                Reviewed {reviewed.size} of {total}
              </span>
              <span className="text-paper/50">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink-3 overflow-hidden">
              <div className="h-full rounded-full bg-mint transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Must-know ---------- */}
      {mustKnow.length > 0 && (
        <div className="rounded-3xl border-2 border-amber/40 bg-amber/[0.07] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-amber" />
            <h3 className="font-display font-bold">Must know</h3>
            <span className="text-xs text-paper/40">if you remember nothing else</span>
          </div>
          <ol className="flex flex-col gap-2.5">
            {mustKnow.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-amber text-night text-xs font-bold flex items-center justify-center flex-shrink-0 mt-px">
                  {i + 1}
                </span>
                <span className="text-paper/90">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ---------- Jump nav ---------- */}
      {total > 1 && (
        <div className="sticky top-[calc(var(--mobile-header-h)+env(safe-area-inset-top,0px))] md:top-0 z-20 -mx-4 px-4 md:-mx-8 md:px-8 py-2.5 bg-ink/85 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex gap-2 scroll-x-touch flex-1 min-w-0">
              {reviewer.sections.map((s, i) => {
                const a = ACCENTS[i % ACCENTS.length];
                const done = reviewed.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => jumpTo(i)}
                    className={clsx(
                      "flex-shrink-0 flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold max-w-[11rem] transition-colors touch-manipulation",
                      done ? "border-mint/40 text-mint bg-mint/10" : clsx("bg-ink-2", a.chip)
                    )}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <span>{i + 1}</span>}
                    <span className="truncate">{s.heading}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(reviewer.sections.map((_, i) => i)))}
              className="flex-shrink-0 text-xs font-semibold text-paper/60 hover:text-paper px-2 py-1.5"
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Section cards ---------- */}
      {reviewer.sections.map((s, i) => (
        <SectionCard
          key={i}
          index={i}
          section={s}
          accent={ACCENTS[i % ACCENTS.length]}
          isOpen={!collapsed.has(i)}
          isReviewed={reviewed.has(i)}
          onToggleOpen={() => toggleCollapsed(i)}
          onToggleReviewed={() => toggleReviewed(i)}
        />
      ))}

      {total > 0 && reviewed.size === total && (
        <div className="rounded-3xl border-2 border-mint/40 bg-mint/10 p-5 text-center">
          <p className="font-display font-bold text-mint">You've reviewed every section 🎉</p>
          <p className="text-sm text-paper/60 mt-1">Lock it in with a quiz or flashcards next.</p>
        </div>
      )}
    </div>
  );
}

function StatChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/60 border border-ink-3 px-3 py-1 text-xs font-semibold text-paper/75">
      {icon}
      {label}
    </span>
  );
}

interface SectionCardProps {
  index: number;
  section: ReviewerSection;
  accent: (typeof ACCENTS)[number];
  isOpen: boolean;
  isReviewed: boolean;
  onToggleOpen: () => void;
  onToggleReviewed: () => void;
}

function SectionCard({ index, section, accent, isOpen, isReviewed, onToggleOpen, onToggleReviewed }: SectionCardProps) {
  const points = strings(section.keyPoints);
  const keyTerms = terms(section.keyTerms);
  const watchOut = strings(section.watchOut);
  const remember = nonEmpty(section.remember) ? section.remember : null;
  const selfCheck =
    section.selfCheck && nonEmpty(section.selfCheck.question) && nonEmpty(section.selfCheck.answer)
      ? section.selfCheck
      : null;

  return (
    <section
      id={`reviewer-section-${index}`}
      className={clsx(
        "scroll-mt-32 md:scroll-mt-20 relative overflow-hidden rounded-3xl border bg-ink-2 transition-colors",
        isReviewed ? "border-mint/40" : "border-ink-3"
      )}
    >
      <span className={clsx("absolute left-0 top-0 bottom-0 w-1.5", isReviewed ? "bg-mint" : accent.bar)} aria-hidden="true" />

      {/* Header — tap to collapse */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 pl-6 pr-4 sm:pr-5 py-4 text-left touch-manipulation"
      >
        <span
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold flex-shrink-0",
            isReviewed ? "bg-mint/15 text-mint" : accent.badge
          )}
        >
          {isReviewed ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold leading-snug break-words">{section.heading}</span>
          <span className="block text-[11px] text-paper/40 mt-0.5">
            {points.length} key point{points.length === 1 ? "" : "s"}
            {keyTerms.length > 0 && ` · ${keyTerms.length} term${keyTerms.length === 1 ? "" : "s"}`}
          </span>
        </span>
        <ChevronDown className={clsx("w-5 h-5 text-paper/40 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="pl-6 pr-4 sm:pr-5 pb-5 flex flex-col gap-4">
          {nonEmpty(section.summary) && (
            <p className="text-sm text-paper/80 leading-relaxed rounded-2xl bg-ink/50 px-4 py-3">{section.summary}</p>
          )}

          {points.length > 0 && (
            <ul className="flex flex-col gap-2">
              {points.map((k, j) => (
                <li key={j} className="flex items-start gap-3 rounded-2xl border border-ink-3 bg-ink/40 px-3.5 py-2.5">
                  <span className={clsx("w-2 h-2 rounded-full mt-[0.45rem] flex-shrink-0", accent.dot)} aria-hidden="true" />
                  <span className="text-sm text-paper/85 leading-relaxed">{k}</span>
                </li>
              ))}
            </ul>
          )}

          {keyTerms.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-paper/45 mb-2">
                <Brain className="w-3.5 h-3.5" /> Key terms
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {keyTerms.map((t, j) => (
                  <div key={j} className="rounded-2xl border border-ink-3 bg-ink/40 p-3.5">
                    <p className={clsx("text-sm font-display font-bold", accent.badge.split(" ")[1])}>{t.term}</p>
                    <p className="text-[13px] text-paper/70 leading-relaxed mt-1">{t.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remember && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber/35 bg-amber/10 px-4 py-3">
              <Lightbulb className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-amber">Remember this</p>
                <p className="text-sm text-paper/90 leading-relaxed mt-0.5">{remember}</p>
              </div>
            </div>
          )}

          {watchOut.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/35 bg-danger/[0.08] px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-danger">Watch out</p>
                <ul className="flex flex-col gap-1.5 mt-1">
                  {watchOut.map((w, j) => (
                    <li key={j} className="text-sm text-paper/90 leading-relaxed">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selfCheck && <SelfCheck question={selfCheck.question} answer={selfCheck.answer} />}

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <p className="text-[11px] text-paper/35">
              Source: {section.source.section} · chunk {section.source.chunk}
            </p>
            <button
              type="button"
              onClick={onToggleReviewed}
              aria-pressed={isReviewed}
              className={clsx(
                "flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
                isReviewed
                  ? "border-mint bg-mint/15 text-mint"
                  : "border-ink-3 text-paper/60 hover:border-mint/50 hover:text-mint"
              )}
            >
              {isReviewed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {isReviewed ? "Reviewed" : "Mark as reviewed"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SelfCheck({ question, answer }: { question: string; answer: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl border border-violet/35 bg-violet/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-violet">Test yourself</p>
      <p className="text-sm text-paper/90 leading-relaxed mt-1 font-semibold">{question}</p>
      {revealed && (
        <p className="text-sm text-paper/80 leading-relaxed mt-2 rounded-xl bg-ink/50 px-3 py-2">{answer}</p>
      )}
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-violet hover:underline touch-manipulation py-1"
      >
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {revealed ? "Hide answer" : "Show answer"}
      </button>
    </div>
  );
}
