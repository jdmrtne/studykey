import { create } from "zustand";
import type { Lesson } from "../types/lesson";
import { isReviewer, type Reviewer } from "../types/study";

const REVIEWERS_KEY = "studykey-reviewers";
const ACTIVE_KEY = "studykey-reviewer-active";
/** Oldest reviewers beyond this many are dropped so history can't grow without bound and fill browser storage. */
const MAX_REVIEWERS = 30;

/** One generated reviewer, saved together with the lesson it came from and how far the student got through it. */
export interface SavedReviewer {
  id: string;
  lessonId: string;
  /** Snapshot of the lesson's title at generation time, so the entry still makes sense if the lesson is deleted. */
  lessonTitle: string;
  createdAt: number;
  reviewer: Reviewer;
  /** Indexes of sections the student has marked "reviewed". */
  reviewedSections: number[];
}

function newId(): string {
  return crypto.randomUUID();
}

function load(): SavedReviewer[] {
  try {
    const raw = localStorage.getItem(REVIEWERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedReviewer[])
      .filter((r) => r && typeof r.id === "string" && typeof r.lessonId === "string" && isReviewer(r.reviewer))
      .map((r) => ({
        ...r,
        lessonTitle: typeof r.lessonTitle === "string" ? r.lessonTitle : r.reviewer.title,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
        reviewedSections: Array.isArray(r.reviewedSections) ? r.reviewedSections.filter((n) => Number.isInteger(n)) : [],
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

function persist(reviewers: SavedReviewer[]): boolean {
  try {
    localStorage.setItem(REVIEWERS_KEY, JSON.stringify(reviewers));
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

interface ReviewerState {
  reviewers: SavedReviewer[];
  /** The reviewer the student last opened or generated. */
  activeId: string | null;
  /** True when the last write to browser storage failed (storage full or blocked). */
  saveFailed: boolean;
  addReviewer: (lesson: Lesson, reviewer: Reviewer) => string;
  openReviewer: (id: string) => void;
  deleteReviewer: (id: string) => void;
  clearAll: () => void;
  setReviewedSections: (id: string, sections: number[]) => void;
}

export const useReviewerStore = create<ReviewerState>((set, get) => {
  function save() {
    const ok = persist(get().reviewers);
    if (get().saveFailed === ok) set({ saveFailed: !ok });
  }

  return {
    reviewers: load(),
    activeId: loadActive(),
    saveFailed: false,

    addReviewer: (lesson, reviewer) => {
      const entry: SavedReviewer = {
        id: newId(),
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        createdAt: Date.now(),
        reviewer,
        reviewedSections: [],
      };
      set((s) => {
        const all = [entry, ...s.reviewers];
        const kept =
          all.length > MAX_REVIEWERS
            ? [entry, ...[...s.reviewers].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_REVIEWERS - 1)]
            : all;
        return { reviewers: kept, activeId: entry.id };
      });
      save();
      persistActive(entry.id);
      return entry.id;
    },

    openReviewer: (id) => {
      set({ activeId: id });
      persistActive(id);
    },

    deleteReviewer: (id) => {
      set((s) => ({
        reviewers: s.reviewers.filter((r) => r.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      }));
      save();
      persistActive(get().activeId);
    },

    clearAll: () => {
      set({ reviewers: [], activeId: null });
      save();
      persistActive(null);
    },

    setReviewedSections: (id, sections) => {
      set((s) => ({
        reviewers: s.reviewers.map((r) => (r.id === id ? { ...r, reviewedSections: sections } : r)),
      }));
      save();
    },
  };
});
