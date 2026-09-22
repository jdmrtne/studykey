import { create } from "zustand";
import type { Lesson } from "../types/lesson";

const STORAGE_KEY = "studykey-lessons";
const SELECTED_KEY = "studykey-selected-lesson";

function loadLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Lesson[]) : [];
  } catch {
    return [];
  }
}

function persistLessons(lessons: Lesson[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  } catch {
    // Lesson text can be large; if it doesn't fit, generation still works
    // for the current session — persistence is best-effort.
  }
}

function loadSelectedId(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function persistSelectedId(id: string | null) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id);
    else localStorage.removeItem(SELECTED_KEY);
  } catch {
    // best-effort, same as lesson persistence above
  }
}

interface LessonsState {
  lessons: Lesson[];
  /**
   * The one lesson the whole app is "pointed at" right now. Every study
   * tool (Quiz, Flashcards, Reviewer, Chat) and the Dashboard read this
   * instead of keeping their own separate lesson pickers, so the active
   * lesson is consistent and visible everywhere — see redesign spec
   * section "Navigation".
   */
  selectedLessonId: string | null;
  addLesson: (lesson: Lesson) => void;
  removeLesson: (id: string) => void;
  selectLesson: (id: string | null) => void;
}

const initialLessons = loadLessons();
const initialSelected = loadSelectedId();

export const useLessonsStore = create<LessonsState>((set, get) => ({
  lessons: initialLessons,
  // Fall back to the most recent lesson if the stored selection no longer
  // exists (e.g. it was deleted in another tab) so the app never silently
  // points at a lesson that isn't there.
  selectedLessonId:
    initialSelected && initialLessons.some((l) => l.id === initialSelected)
      ? initialSelected
      : (initialLessons[0]?.id ?? null),

  addLesson: (lesson) => {
    const next = [lesson, ...get().lessons];
    set({ lessons: next });
    persistLessons(next);
    // A freshly-added lesson becomes the active one — the student just
    // said "this is what I'm studying now".
    get().selectLesson(lesson.id);
  },

  removeLesson: (id) => {
    const next = get().lessons.filter((l) => l.id !== id);
    set({ lessons: next });
    persistLessons(next);
    if (get().selectedLessonId === id) {
      get().selectLesson(next[0]?.id ?? null);
    }
  },

  selectLesson: (id) => {
    set({ selectedLessonId: id });
    persistSelectedId(id);
  },
}));

/** Selector: the full Lesson object currently selected, or undefined. */
export function selectSelectedLesson(s: LessonsState): Lesson | undefined {
  return s.lessons.find((l) => l.id === s.selectedLessonId);
}
