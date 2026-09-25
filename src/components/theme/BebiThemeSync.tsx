import { useEffect } from "react";
import { useUserPreferencesStore } from "../../store/userPreferencesStore";

/**
 * Switches the whole app's accent color between the default blue theme and the "bebi" baby-pink
 * variant, purely by toggling a `data-bebi` attribute on `<html>` — the same pattern useTheme.tsx
 * already uses for `data-theme="light"`. The actual color swap lives entirely in index.css
 * ([data-bebi="true"] / [data-bebi="true"][data-theme="light"]).
 *
 * Deliberately stateless: `userNickname === "bebi"` (the existing, already-persisted nickname
 * Easter egg) is the one and only source of truth, exactly like the floating-hearts effect. There is
 * no separate "pink theme enabled" flag to keep in sync, so this automatically follows the nickname
 * across refreshes, new chats, other lessons, and re-enabling/disabling.
 *
 * Renders nothing — mount once near the app root (see App.tsx) so it applies regardless of route.
 */
export function BebiThemeSync() {
  const nickname = useUserPreferencesStore((s) => s.nickname);
  const isBebiMode = nickname === "bebi";

  useEffect(() => {
    const root = document.documentElement;
    if (isBebiMode) {
      root.setAttribute("data-bebi", "true");
    } else {
      root.removeAttribute("data-bebi");
    }
  }, [isBebiMode]);

  return null;
}
