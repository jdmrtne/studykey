import clsx from "clsx";

interface MultiSelectPillsProps<T extends string> {
  options: readonly T[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  labels?: Record<string, string>;
}

/**
 * Checkbox-group sibling to SelectPills (which is a single-select
 * radiogroup). Same visual language, but any number of pills can be
 * active at once — used by CreateGame's Custom Mix category picker
 * (0022_custom_category_mix.sql).
 */
export function MultiSelectPills<T extends string>({
  options,
  value,
  onChange,
  labels,
}: MultiSelectPillsProps<T>) {
  function toggle(opt: T) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((opt) => {
        const active = value.includes(opt);
        const label = labels?.[opt] ?? opt;
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => toggle(opt)}
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
