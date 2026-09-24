import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../lib/pwa/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="flex items-start gap-3 px-4 md:px-8 py-2.5 bg-amber/15 border-b border-amber/40 text-sm">
      <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber" aria-hidden="true" />
      <p className="text-paper/90">
        <span className="font-semibold">You’re offline.</span> Your saved study materials are still available.{" "}
        <span className="text-paper/65">Generating and chatting need an internet connection.</span>
      </p>
    </div>
  );
}
