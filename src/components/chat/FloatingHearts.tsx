import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useUserPreferencesStore } from "../../store/userPreferencesStore";
import type { ChatMessage } from "../../types/chat";

/**
 * Purely cosmetic Easter-egg overlay for the "bebi" nickname: a handful of small hearts float up and
 * fade out once whenever MJ finishes a response, but ONLY while the nickname preference is active.
 *
 * There is deliberately no separate "hearts enabled" flag anywhere — visibility is derived straight
 * from `useUserPreferencesStore().nickname` (the same single source of truth the nickname Easter egg
 * already uses), so this stays in lockstep with it automatically: same activation/deactivation
 * triggers, same persistence across refreshes/new chats/lessons, nothing extra to keep in sync.
 */

const HEARTS_PER_BURST = 7;
// A little longer than the CSS animation's own max duration, so a burst is only ever removed
// from the DOM after every heart in it has finished animating.
const BURST_CLEANUP_MS = 3200;

interface FloatingHeart {
  id: string;
  style: CSSProperties;
}

interface HeartBurst {
  id: string;
  hearts: FloatingHeart[];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeBurst(burstId: string): HeartBurst {
  const hearts: FloatingHeart[] = Array.from({ length: HEARTS_PER_BURST }, (_, i) => {
    const size = randomBetween(13, 26);
    const rotate = randomBetween(-24, 24);
    const drift = randomBetween(-36, 36);
    const delay = randomBetween(0, 0.5);
    const duration = randomBetween(1.7, 2.6);
    const left = randomBetween(6, 90);

    return {
      id: `${burstId}-${i}`,
      style: {
        left: `${left}%`,
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        // Read by the @keyframes in index.css to vary drift/rotation per-heart.
        "--bebi-heart-drift": `${drift}px`,
        "--bebi-heart-rotate": `${rotate}deg`,
      } as CSSProperties,
    };
  });
  return { id: burstId, hearts };
}

interface Props {
  /** The active thread's messages, newest last — same array ChatPanel already renders. */
  messages: ChatMessage[];
}

export function FloatingHearts({ messages }: Props) {
  // Reactive: flips instantly (and only) when the shared nickname preference changes, so a
  // "don't call me bebi anymore" mid-animation clears hearts immediately, and re-enabling it
  // later resumes them — no extra state, nothing to persist separately.
  const nickname = useUserPreferencesStore((s) => s.nickname);
  const heartsEnabled = nickname === "bebi";

  const [bursts, setBursts] = useState<HeartBurst[]>([]);
  // Tracks each assistant message's last-seen `pending` flag so a burst fires exactly once per
  // completed response — never on every streamed/re-rendered update, and never on first load.
  const prevPendingRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const prevPending = prevPendingRef.current;
    const nextPending = new Map<string, boolean>();
    const newlyCompletedIds: string[] = [];

    for (const m of messages) {
      if (m.role !== "assistant") continue;
      nextPending.set(m.id, !!m.pending);
      const wasPending = prevPending.get(m.id);
      const justFinished = wasPending === true && !m.pending && !m.error && m.content.trim().length > 0;
      if (justFinished) newlyCompletedIds.push(m.id);
    }
    prevPendingRef.current = nextPending;

    if (!heartsEnabled || newlyCompletedIds.length === 0) return;

    for (const id of newlyCompletedIds) {
      const burstId = `${id}-${Date.now()}`;
      setBursts((current) => [...current, makeBurst(burstId)]);
      setTimeout(() => {
        setBursts((current) => current.filter((b) => b.id !== burstId));
      }, BURST_CLEANUP_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, heartsEnabled]);

  // Belt-and-suspenders: if the nickname is turned off mid-animation, drop any hearts on screen
  // right away instead of letting an in-flight burst finish.
  useEffect(() => {
    if (!heartsEnabled) setBursts([]);
  }, [heartsEnabled]);

  if (!heartsEnabled || bursts.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30" aria-hidden="true">
      {bursts.flatMap((burst) =>
        burst.hearts.map((heart) => (
          <span key={heart.id} className="memora-bebi-heart" style={heart.style}>
            ❤️
          </span>
        ))
      )}
    </div>
  );
}
