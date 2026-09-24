/**
 * Install-prompt state, captured at module load so we never miss
 * `beforeinstallprompt` (it can fire before React mounts). Exposed through
 * useSyncExternalStore so components stay in sync.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "memora-install-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export interface InstallState {
  canPrompt: boolean;
  installed: boolean;
  snoozed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = detectStandalone();
let snapshot: InstallState = compute();
const listeners = new Set<() => void>();

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true;
}

function readSnoozed(): boolean {
  try {
    return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  } catch {
    return false;
  }
}

function compute(): InstallState {
  return { canPrompt: deferred !== null, installed, snoozed: readSnoozed() };
}

function emit() {
  snapshot = compute();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own, less intrusive UI
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", () => {
    installed = detectStandalone();
    emit();
  });
}

export function subscribeInstall(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getInstallState(): InstallState {
  return snapshot;
}

/** Shows the native prompt. Returns the user's choice, or null if unavailable. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  if (!deferred) return null;
  const ev = deferred;
  deferred = null; // a prompt event can only be used once
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "dismissed") snoozeInstall();
    emit();
    return outcome;
  } catch {
    emit();
    return null;
  }
}

/** Hide the compact install nudges for two weeks so we don't nag. */
export function snoozeInstall() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // ignore — worst case the nudge reappears next visit
  }
  emit();
}

export type InstallPlatform = "ios" | "android" | "desktop-chromium" | "firefox" | "other";

export function detectInstallPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\/|Edg\//.test(ua)) return "desktop-chromium";
  return "other";
}
