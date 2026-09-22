import { Check } from "lucide-react";
import clsx from "clsx";

interface StepIndicatorProps {
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
  /** Called when the user taps an already-completed step to jump back. */
  onStepClick?: (index: number) => void;
}

/**
 * Numbered step indicator for the Game Setup flow (Categories → Game
 * Modes → Questions → Timing → Summary). Completed steps show a
 * checkmark and are tappable to jump back; the current step is
 * highlighted; future steps are dim and inert.
 */
export function StepIndicator({ steps, current, onStepClick }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Game setup steps">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "upcoming";
        const clickable = state === "done" && !!onStepClick;
        return (
          <li key={label} className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={clsx(
                "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-colors touch-manipulation",
                state === "active" && "bg-signal/10 text-signal",
                state === "done" && "text-paper/70",
                state === "upcoming" && "text-paper/30",
                clickable && "hover:text-signal cursor-pointer",
                !clickable && "cursor-default"
              )}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span
                className={clsx(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                  state === "active" && "bg-signal text-night",
                  state === "done" && "bg-mint text-night",
                  state === "upcoming" && "bg-ink-3 text-paper/40"
                )}
              >
                {state === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && (
              <span
                className={clsx(
                  "h-0.5 flex-1 rounded-full",
                  i < current ? "bg-mint/60" : "bg-ink-3"
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
