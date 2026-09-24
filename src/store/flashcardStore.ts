import { create } from "zustand";
import type { Lesson } from "../types/lesson";
import { isFlashcardSet, type Flashcard } from "../types/study";

const DECKS_KEY = "studykey-flashcard-decks";
const ACTIVE_KEY = "studykey-flashcard-active";
/** Oldest decks beyond this many are dropped so history can't grow without bound and fill browser storage. */
const MAX_DECKS = 30;

/** One generated flashcard deck, saved with the lesson it came from and where the student left off. */
export interface SavedDeck {
  id: string;
  lessonId: string;
  /** Snapshot of the lesson's title at generation time, so the entry still makes sense if the lesson is deleted. */
  lessonTitle: string;
  createdAt: number;
  cards: Flashcard[];
  /** Index of the card the student was last on. */
  position: number;
}

function newId(): string {
  return crypto.randomUUID();
}

function load(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedDeck[])
      .filter(
        (d) => d && typeof d.id === "string" && typeof d.lessonId === "string" && isFlashcardSet({ cards: d.cards }) && d.cards.length > 0
      )
      .map((d) => ({
        ...d,
        lessonTitle: typeof d.lessonTitle === "string" ? d.lessonTitle : "Flashcards",
        createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
        position: Number.isInteger(d.position) ? Math.min(Math.max(d.position, 0), d.cards.length - 1) : 0,
      }));
  } catch {
    return [];
  }
}

function loadActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function persist(decks: SavedDeck[]): boolean {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    return true;
  } catch {
    return false;
  }
}

function persistActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // best-effort
  }
}

interface FlashcardState {
  decks: SavedDeck[];
  /** The deck the student last opened or generated. */
  activeId: string | null;
  /** True when the last write to browser storage failed (storage full or blocked). */
  saveFailed: boolean;
  addDeck: (lesson: Lesson, cards: Flashcard[]) => string;
  openDeck: (id: string) => void;
  deleteDeck: (id: string) => void;
  clearAll: () => void;
  setPosition: (id: string, position: number) => void;
}

export const useFlashcardStore = create<FlashcardState>((set, get) => {
  function save() {
    const ok = persist(get().decks);
    if (get().saveFailed === ok) set({ saveFailed: !ok });
  }

  return {
    decks: load(),
    activeId: loadActive(),
    saveFailed: false,

    addDeck: (lesson, cards) => {
      const entry: SavedDeck = {
        id: newId(),
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        createdAt: Date.now(),
        cards,
        position: 0,
      };
      set((s) => {
        const all = [entry, ...s.decks];
        const kept =
          all.length > MAX_DECKS
            ? [entry, ...[...s.decks].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_DECKS - 1)]
            : all;
        return { decks: kept, activeId: entry.id };
      });
      save();
      persistActive(entry.id);
      return entry.id;
    },

    openDeck: (id) => {
      set({ activeId: id });
      persistActive(id);
    },

    deleteDeck: (id) => {
      set((s) => ({
        decks: s.decks.filter((d) => d.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      }));
      save();
      persistActive(get().activeId);
    },

    clearAll: () => {
      set({ decks: [], activeId: null });
      save();
      persistActive(null);
    },

    setPosition: (id, position) => {
      set((s) => ({ decks: s.decks.map((d) => (d.id === id ? { ...d, position } : d)) }));
      save();
    },
  };
});
