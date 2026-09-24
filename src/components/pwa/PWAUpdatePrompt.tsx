import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Registers the service worker and offers a reload when a new version is ready. */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update().catch(() => {}), UPDATE_CHECK_MS);
    },
    onRegisterError(err) {
      console.warn("Memora: service worker registration failed", err);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed z-50 inset-x-3 md:inset-x-auto md:right-6 md:w-96 rounded-2xl border border-ink-3 bg-ink-2 shadow-xl p-4 flex items-start gap-3"
      style={{ bottom: "calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <RefreshCw className="w-4 h-4 mt-0.5 text-signal flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 text-sm">
        {needRefresh ? (
          <>
            <p className="font-semibold">A new version of Memora is ready.</p>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="mt-2 rounded-full bg-signal text-night px-4 min-h-[2.75rem] font-semibold hover:bg-signal-dim transition-colors"
            >
              Reload to update
            </button>
          </>
        ) : (
          <p className="font-semibold">Memora is ready to work offline.</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
        className="w-11 h-11 -m-2 rounded-full flex items-center justify-center text-paper/50 hover:text-paper"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
