const key = (lessonId: string) => `memora-reader-progress:${lessonId}`;

export function loadProgress(lessonId: string): number {
  try {
    const n = Number(localStorage.getItem(key(lessonId)));
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  } catch {
    return 1;
  }
}

export function saveProgress(lessonId: string, position: number) {
  try {
    localStorage.setItem(key(lessonId), String(position));
  } catch {
    // best-effort
  }
}

export function clearProgress(lessonId: string) {
  try {
    localStorage.removeItem(key(lessonId));
  } catch {
    // best-effort
  }
}
