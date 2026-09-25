import { Trophy, Flame, Heart, Clock, Award, RotateCcw, ArrowLeftRight, Home } from "lucide-react";
import { Button } from "../ui/Button";
import { ACHIEVEMENTS, type QuizRunResult } from "../../types/quizGame";

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  result: QuizRunResult;
  onPlayAgain: () => void;
  onChangeMode: () => void;
  onBackToLessons: () => void;
}

export function QuizResults({ result, onPlayAgain, onChangeMode, onBackToLessons }: Props) {
  const accuracy = result.questions.length ? Math.round((result.correctCount / result.questions.length) * 100) : 0;
  const wasCutShort = !result.completedAllQuestions;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border-2 border-signal/40 bg-signal/5 p-6 flex flex-col items-center text-center gap-2">
        <Trophy className="w-9 h-9 text-gold" />
        <h2 className="font-display text-xl font-bold">{wasCutShort ? "Run ended" : "Run complete!"}</h2>
        <p className="text-3xl font-display font-bold tabular-nums">{result.score.toLocaleString()}</p>
        <p className="text-sm text-paper/60">
          {result.correctCount} / {result.questions.length} correct · {accuracy}% accuracy
        </p>
        <p className="text-sm font-semibold text-gold">+{result.xpEarned} XP</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Flame} label="Best streak" value={String(result.bestStreakThisRun)} />
        {result.livesLeft !== null && <StatCard icon={Heart} label="Lives left" value={String(Math.max(result.livesLeft, 0))} />}
        {result.timeLeftMs !== null && <StatCard icon={Clock} label="Time left" value={formatTime(result.timeLeftMs)} />}
        <StatCard icon={Award} label="Achievements" value={String(result.newAchievements.length)} />
      </div>

      {result.newAchievements.length > 0 && (
        <div className="rounded-2xl border-2 border-gold/40 bg-gold/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gold">Achievements unlocked</p>
          <div className="flex flex-col gap-2">
            {result.newAchievements.map((id) => {
              const def = ACHIEVEMENTS.find((a) => a.id === id);
              if (!def) return null;
              return (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                    <Award className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{def.label}</p>
                    <p className="text-xs text-paper/60">{def.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="primary" onClick={onPlayAgain} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" /> Play again
        </Button>
        <Button variant="secondary" onClick={onChangeMode} className="flex-1">
          <ArrowLeftRight className="w-4 h-4 mr-2" /> Try a different mode
        </Button>
        <Button variant="ghost" onClick={onBackToLessons} className="flex-1">
          <Home className="w-4 h-4 mr-2" /> Back to lessons
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink-3 bg-ink-2 p-3 flex flex-col items-center text-center gap-1">
      <Icon className="w-4 h-4 text-signal" />
      <p className="text-lg font-display font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-paper/50">{label}</p>
    </div>
  );
}
