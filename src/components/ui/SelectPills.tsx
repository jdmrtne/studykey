import clsx from "clsx";

interface SelectPillsProps<T extends string | number> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Record<string, string>;
  suffix?: string;
}

export function SelectPills<T extends string | number>({
  options,
  value,
  onChange,
  labels,
  suffix,
}: SelectPillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const active = opt === value;
        const label = labels?.[String(opt)] ?? `${opt}${suffix ?? ""}`;
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={clsx(
              "px-4 py-2.5 min-h-[2.75rem] rounded-full text-sm font-semibold border-2 transition-colors touch-manipulation",
              active
                ? "bg-signal text-night border-signal"
                : "bg-ink-2 text-paper/80 border-ink-3 hover:border-signal/50"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
