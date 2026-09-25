import clsx from "clsx";
import { Sparkles, Clock, Heart, Flame, Crown, Shuffle } from "lucide-react";
import { QUIZ_MODES, type QuizMode } from "../../types/quizGame";

const ICONS: Record<QuizMode, React.ComponentType<{ className?: string }>> = {
  classic: Sparkles,
  time_attack: Clock,
  survival: Heart,
  streak_rush: Flame,
  boss_round: Crown,
  chaos: Shuffle,
};

interface Props {
  onSelect: (mode: QuizMode) => void;
}

export function ModeSelect({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUIZ_MODES.map((m) => {
          const Icon = ICONS[m.id];
          return (
            <button
              key={m.id}
              type="button"
              disabled={m.comingSoon}
              onClick={() => onSelect(m.id)}
              className={clsx(
                "text-left rounded-2xl border-2 p-4 flex flex-col gap-2 transition-colors touch-manipulation",
                m.comingSoon
                  ? "border-ink-3 opacity-50 cursor-not-allowed"
                  : "border-ink-3 bg-ink-2 hover:border-signal/60 active:scale-[0.99]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-signal/10 text-signal flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                {m.comingSoon && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-paper/40 bg-ink-3 rounded-full px-2 py-1">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="font-display font-semibold">{m.label}</p>
              <p className="text-xs text-paper/60">{m.tagline}</p>
            </button>
          );
        })}
      </div>

      <SurpriseMeButton onSelect={onSelect} />
    </div>
  );
}

function SurpriseMeButton({ onSelect }: Props) {
  const playable = QUIZ_MODES.filter((m) => !m.comingSoon).map((m) => m.id);

  function surprise() {
    const pick = playable[Math.floor(Math.random() * playable.length)];
    onSelect(pick);
  }

  return (
    <button
      type="button"
      onClick={surprise}
      className="self-start text-sm font-semibold text-violet hover:text-violet-dim flex items-center gap-1.5 py-2 px-1 -mx-1 touch-manipulation"
    >
      <Shuffle className="w-4 h-4" /> Surprise me
    </button>
  );
}
