import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, Heart, Clock, Flame, Snowflake, SkipForward, Wand2, Eye } from "lucide-react";
import { Button } from "../ui/Button";
import type { QuizEngineState } from "../../hooks/useQuizEngine";
import type { Lesson } from "../../types/lesson";
import type { PowerUpKind, QuizMode } from "../../types/quizGame";

const POWER_UP_META: Record<PowerUpKind, { label: string; icon: typeof Wand2 }> = {
  fifty_fifty: { label: "50/50", icon: Wand2 },
  freeze: { label: "Freeze", icon: Snowflake },
  skip: { label: "Skip", icon: SkipForward },
};

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  engine: QuizEngineState;
  mode: QuizMode;
  lesson?: Lesson;
}

export function QuizPlayer({ engine, mode, lesson }: Props) {
  const [showSource, setShowSource] = useState(false);
  const q = engine.question;

  useEffect(() => {
    setShowSource(false);
  }, [engine.index]);

  const options = q.type === "multiple_choice" && q.options ? q.options.filter((o) => !engine.hiddenOptions.includes(o)) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Hud engine={engine} mode={mode} />

      {engine.justEarnedPowerUp && !engine.revealed && (
        <div className="rounded-xl bg-gold/10 border-2 border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 flex items-center gap-2 animate-pulse">
          <Wand2 className="w-4 h-4" /> Power-up earned: {POWER_UP_META[engine.justEarnedPowerUp].label}!
        </div>
      )}

      {engine.frozen && !engine.revealed && (
        <div className="rounded-xl bg-signal/10 border-2 border-signal/40 text-signal text-sm font-semibold px-4 py-2.5 flex items-center gap-2">
          <Snowflake className="w-4 h-4" /> Timer frozen for this question
        </div>
      )}

      <div className="rounded-2xl border-2 border-ink-3 bg-ink-2 p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold text-paper/40 uppercase tracking-wide">
          Question {engine.index + 1} of {engine.total}
        </p>
        <p className="font-display font-semibold text-lg">{q.question}</p>

        {q.type === "multiple_choice" && options && (
          <div className="flex flex-col gap-2">
            {options.map((opt) => {
              const chosen = engine.picked === opt;
              const isAnswer = engine.revealed && opt.trim().toLowerCase() === q.answer.trim().toLowerCase();
              const isWrongChoice = engine.revealed && chosen && !isAnswer;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={engine.revealed}
                  onClick={() => engine.submitAnswer(opt)}
                  className={clsx(
                    "text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-colors touch-manipulation",
                    isAnswer && "border-mint bg-mint/10",
                    isWrongChoice && "border-danger bg-danger/10",
                    !engine.revealed && chosen && "border-signal bg-signal/10",
                    !engine.revealed && !chosen && "border-ink-3 hover:border-signal/40"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-2">
            {["True", "False"].map((opt) => {
              const chosen = engine.picked === opt;
              const isAnswer = engine.revealed && opt.trim().toLowerCase() === q.answer.trim().toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={engine.revealed}
                  onClick={() => engine.submitAnswer(opt)}
                  className={clsx(
                    "flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors touch-manipulation",
                    isAnswer && "border-mint bg-mint/10",
                    engine.revealed && chosen && !isAnswer && "border-danger bg-danger/10",
                    !engine.revealed && chosen && "border-signal bg-signal/10",
                    !engine.revealed && !chosen && "border-ink-3 hover:border-signal/40"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "identification" && (
          <IdentificationInput
            disabled={engine.revealed}
            revealed={engine.revealed}
            correct={engine.lastCorrect}
            onSubmit={(v) => engine.submitAnswer(v)}
          />
        )}

        {engine.revealed && (
          <div className={clsx("flex items-start gap-2 text-sm rounded-xl p-3", engine.lastCorrect ? "bg-mint/10 text-mint" : "bg-danger/10 text-danger")}>
            {engine.lastCorrect ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <div>
              <p className="font-semibold">{engine.lastCorrect ? "Correct!" : `Correct answer: ${q.answer}`}</p>
              <p className="text-paper/70 mt-0.5">{q.explanation}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          className="text-xs text-paper/40 hover:text-signal flex items-center gap-1 self-start py-2 px-1 -mx-1 touch-manipulation"
        >
          <Eye className="w-3.5 h-3.5" /> View source
        </button>
        {showSource && lesson && (
          <div className="rounded-xl bg-ink p-3 text-xs text-paper/60">
            <p className="font-semibold text-paper/70 mb-1">
              {q.source.section} · chunk {q.source.chunk}
            </p>
            <p className="line-clamp-6 whitespace-pre-wrap">{lesson.chunks.find((c) => c.index === q.source.chunk)?.text ?? "Source chunk not found."}</p>
          </div>
        )}
      </div>

      <PowerUpBar engine={engine} />

      {engine.revealed && (
        <Button variant="primary" onClick={engine.next} className="self-start">
          {engine.index + 1 >= engine.total ? "See results" : "Next question"}
        </Button>
      )}
    </div>
  );
}

function IdentificationInput({
  disabled,
  revealed,
  correct,
  onSubmit,
}: {
  disabled: boolean;
  revealed: boolean;
  correct: boolean | null;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!revealed) setValue("");
  }, [revealed]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value);
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer"
        className={clsx(
          "flex-1 rounded-xl border-2 border-ink-3 bg-ink px-4 py-2.5 text-sm outline-none focus:border-signal",
          revealed && (correct ? "border-mint" : "border-danger")
        )}
      />
      {!disabled && (
        <Button type="submit" variant="secondary" disabled={!value.trim()}>
          Submit
        </Button>
      )}
    </form>
  );
}

function Hud({ engine, mode }: { engine: QuizEngineState; mode: QuizMode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatChip label="Score" value={String(engine.score)} />
      <StreakMeter streak={engine.streak} />
      {mode === "survival" && engine.lives !== null && (
        <div className="flex items-center gap-1 rounded-full bg-ink-2 border-2 border-ink-3 px-3 py-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={clsx("w-4 h-4", i < (engine.lives ?? 0) ? "text-danger fill-danger" : "text-ink-3")} />
          ))}
        </div>
      )}
      {engine.timeLeftMs !== null && (
        <div
          className={clsx(
            "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold tabular-nums",
            engine.timeLeftMs < 5000 ? "border-danger/60 text-danger" : "border-ink-3 text-paper/80"
          )}
        >
          <Clock className="w-4 h-4" /> {formatTime(engine.timeLeftMs)}
        </div>
      )}
    </div>
  );
}

function StreakMeter({ streak }: { streak: number }) {
  const filled = streak === 0 ? 0 : ((streak - 1) % 3) + 1;
  const onFire = streak >= 6;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-ink-2 border-2 border-ink-3 px-3 py-1.5">
      <Flame className={clsx("w-4 h-4", onFire ? "text-amber" : streak > 0 ? "text-violet" : "text-ink-3")} />
      <span className="text-sm font-semibold tabular-nums">{streak}</span>
      <div className="flex gap-0.5 ml-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className={clsx("w-1.5 h-3 rounded-full transition-colors", i < filled ? (onFire ? "bg-amber" : "bg-violet") : "bg-ink-3")} />
        ))}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-ink-2 border-2 border-ink-3 px-3 py-1.5 text-sm">
      <span className="text-paper/50">{label}</span> <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function PowerUpBar({ engine }: { engine: QuizEngineState }) {
  const kinds = engine.availablePowerUps;
  const anyHeld = kinds.some((k) => engine.powerUps[k] > 0);
  if (!anyHeld) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((kind) => {
        const count = engine.powerUps[kind];
        if (count <= 0) return null;
        const meta = POWER_UP_META[kind];
        const Icon = meta.icon;
        const disabled =
          engine.revealed ||
          (kind === "fifty_fifty" && (engine.question.type !== "multiple_choice" || engine.hiddenOptions.length > 0)) ||
          (kind === "freeze" && engine.frozen) ||
          (kind === "skip" && engine.skipUsed);
        const action = kind === "fifty_fifty" ? engine.useFiftyFifty : kind === "freeze" ? engine.useFreeze : engine.useSkip;
        return (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            onClick={action}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
              disabled ? "border-ink-3 opacity-40 cursor-not-allowed" : "border-violet/50 text-violet hover:bg-violet/10"
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {meta.label} × {count}
          </button>
        );
      })}
    </div>
  );
}
