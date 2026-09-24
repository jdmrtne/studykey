import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useTheme, type ThemePreference } from "../../hooks/useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border-2 border-ink-3 bg-ink-2 p-1 self-start">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 min-h-[2.5rem] text-sm font-semibold transition-colors touch-manipulation",
              active ? "bg-signal text-night" : "text-paper/70 hover:text-paper"
            )}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
