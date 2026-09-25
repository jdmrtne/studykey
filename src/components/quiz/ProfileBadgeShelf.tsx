import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, Star, Award, Lock } from "lucide-react";
import { useQuizProfileStore, rankForXp } from "../../store/quizProfileStore";
import { ACHIEVEMENTS } from "../../types/quizGame";

interface Props {
  lessonId?: string;
}

export function ProfileBadgeShelf({ lessonId }: Props) {
  const [open, setOpen] = useState(false);
  const xp = useQuizProfileStore((s) => s.xp);
  const totalRuns = useQuizProfileStore((s) => s.totalRuns);
  const achievements = useQuizProfileStore((s) => s.achievements);
  const bestByLesson = useQuizProfileStore((s) => s.bestByLesson);
  const { tier, next, progress } = rankForXp(xp);
  const lessonBest = lessonId ? bestByLesson[lessonId] : undefined;

  return (
    <div className="rounded-2xl border-2 border-ink-3 bg-ink-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left touch-manipulation"
      >
        <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">
            {tier.title} <span className="text-paper/40 font-normal">· {xp.toLocaleString()} XP</span>
          </p>
          <div className="h-1.5 rounded-full bg-ink-3 mt-1.5 overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
        <ChevronDown className={clsx("w-4 h-4 text-paper/40 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t-2 border-ink-3 pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <p className="text-paper/60">
              Quizzes played: <span className="font-semibold text-paper">{totalRuns}</span>
            </p>
            {next && (
              <p className="text-paper/60">
                Next rank <span className="font-semibold text-paper">{next.title}</span> at {next.minXp.toLocaleString()} XP
              </p>
            )}
            {lessonBest && (
              <p className="text-paper/60">
                This lesson's best: <span className="font-semibold text-paper">{lessonBest.bestScore.toLocaleString()} pts</span>,{" "}
                {lessonBest.bestStreak} streak
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-paper/40 uppercase tracking-wide">Badges</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = achievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    title={a.description}
                    className={clsx(
                      "rounded-xl border-2 p-2.5 flex flex-col items-center text-center gap-1",
                      unlocked ? "border-gold/40 bg-gold/5" : "border-ink-3 opacity-50"
                    )}
                  >
                    {unlocked ? <Award className="w-4 h-4 text-gold" /> : <Lock className="w-4 h-4 text-paper/40" />}
                    <p className="text-[11px] font-semibold leading-tight">{a.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
