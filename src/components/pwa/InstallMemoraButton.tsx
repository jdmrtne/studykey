import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Check, X } from "lucide-react";
import clsx from "clsx";
import {
  detectInstallPlatform,
  getInstallState,
  promptInstall,
  snoozeInstall,
  subscribeInstall,
  type InstallPlatform,
} from "../../lib/pwa/installPrompt";

const INSTRUCTIONS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: "Install on iPhone / iPad",
    steps: [
      "Open Memora in Safari.",
      "Tap the Share button.",
      "Choose “Add to Home Screen”, then tap Add.",
    ],
  },
  android: {
    title: "Install on Android",
    steps: ["Open the browser menu (⋮).", "Tap “Install app” or “Add to Home screen”.", "Confirm to install."],
  },
  "desktop-chromium": {
    title: "Install on desktop",
    steps: [
      "Look for the install icon at the right end of the address bar.",
      "Or open the browser menu and choose “Install Memora”.",
    ],
  },
  firefox: {
    title: "Install from Firefox",
    steps: [
      "Desktop Firefox can't install web apps.",
      "On Android, open the menu and tap “Install”.",
      "Or open Memora in Chrome, Edge or Safari.",
    ],
  },
  other: {
    title: "Install Memora",
    steps: ["Open your browser menu and look for “Install app” or “Add to Home Screen”."],
  },
};

function InstructionsDialog({ onClose }: { onClose: () => void }) {
  const info = INSTRUCTIONS[detectInstallPlatform()];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={info.title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[1.25rem] border border-ink-3 bg-ink-2 p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-semibold">{info.title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-paper/60 hover:text-paper hover:bg-ink-3/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ol className="list-decimal pl-5 flex flex-col gap-2 text-sm text-paper/75">
          {info.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * "Install Memora" action.
 *  - variant "card": always visible (Settings). Shows install / how-to / installed state.
 *  - variant "compact": a small nudge that only appears when the browser can actually prompt,
 *    the app isn't installed, and the user hasn't dismissed it in the last 14 days.
 */
export function InstallMemoraButton({ variant = "card", className }: { variant?: "card" | "compact"; className?: string }) {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const [showHelp, setShowHelp] = useState(false);

  if (variant === "compact") {
    if (state.installed || !state.canPrompt || state.snoozed) return null;
    return (
      <div className={clsx("flex items-center gap-1", className)}>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="flex items-center gap-2 rounded-full bg-signal text-night px-3.5 min-h-[2.75rem] text-sm font-semibold hover:bg-signal-dim transition-colors touch-manipulation"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Install Memora
        </button>
        <button
          type="button"
          onClick={snoozeInstall}
          aria-label="Dismiss install suggestion"
          className="w-11 h-11 rounded-full flex items-center justify-center text-paper/50 hover:text-paper hover:bg-ink-3/60"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (state.installed) {
    return (
      <p className={clsx("flex items-center gap-2 text-sm text-mint font-semibold", className)}>
        <Check className="w-4 h-4" aria-hidden="true" />
        Memora is installed on this device.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (state.canPrompt ? void promptInstall() : setShowHelp(true))}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-full bg-signal text-night px-5 min-h-[2.75rem] text-sm font-semibold hover:bg-signal-dim transition-colors touch-manipulation w-full sm:w-auto sm:self-start",
          className
        )}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        {state.canPrompt ? "Install Memora" : "How to install Memora"}
      </button>
      {showHelp && <InstructionsDialog onClose={() => setShowHelp(false)} />}
    </>
  );
}
