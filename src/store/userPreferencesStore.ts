import { create } from "zustand";

const STORAGE_KEY = "studykey-user-preferences";

interface UserPreferencesData {
  /** Nickname MJ currently uses for the student (e.g. "bebi"). null = none active. */
  nickname: string | null;
}

function defaultData(): UserPreferencesData {
  return { nickname: null };
}

function load(): UserPreferencesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<UserPreferencesData>;
    return { nickname: typeof parsed.nickname === "string" ? parsed.nickname : null };
  } catch {
    return defaultData();
  }
}

function persist(data: UserPreferencesData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort, same posture as the other stores in this app
  }
}

interface UserPreferencesState extends UserPreferencesData {
  setNickname: (nickname: string | null) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>((set) => ({
  ...load(),

  setNickname: (nickname) => {
    set({ nickname });
    persist({ nickname });
  },
}));

/** Non-hook accessor for reading the current nickname outside React components (e.g. from the chat store). */
export function getUserNickname(): string | null {
  return useUserPreferencesStore.getState().nickname;
}
