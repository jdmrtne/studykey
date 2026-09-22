import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="flex items-center justify-center w-11 h-11 rounded-full bg-ink-2 text-paper border-2 border-ink-3 hover:border-signal/60 transition-all duration-150 active:scale-[0.95] touch-manipulation focus-visible:outline-3 focus-visible:outline-signal"
    >
      {isLight ? (
        <Moon className="w-5 h-5" strokeWidth={2.25} />
      ) : (
        <Sun className="w-5 h-5" strokeWidth={2.25} />
      )}
    </button>
  );
}
