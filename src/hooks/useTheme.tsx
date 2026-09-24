import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** The theme actually being shown. */
export type Theme = "dark" | "light";
/** What the user chose. "system" follows the OS and is the default. */
export type ThemePreference = Theme | "system";

// Kept as-is so existing users' saved choice survives the rebrand.
const STORAGE_KEY = "studykey-theme";
const THEME_COLORS: Record<Theme, string> = { light: "#3F5BDB", dark: "#0f1320" };

function systemTheme(): Theme {
  // Matches "light" specifically: environments reporting no preference get dark.
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getInitialPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall through.
  }
  return "system";
}

interface ThemeContextValue {
  /** Resolved theme currently applied. */
  theme: Theme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  /** Flips the resolved theme and pins it as an explicit choice. */
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [system, setSystem] = useState<Theme>(() => (typeof window === "undefined" ? "dark" : systemTheme()));
  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Best-effort persistence only.
    }
  }, [preference]);

  const setPreference = (next: ThemePreference) => setPreferenceState(next);
  const setTheme = (next: Theme) => setPreferenceState(next);
  const toggleTheme = () => setPreferenceState(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
