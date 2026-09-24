/**
 * Keeps the ORIGINAL uploaded file (PDF/DOCX/PPTX/...) on this device in IndexedDB so
 * the reader can show it and "Download Original" always works. localStorage is far too
 * small for binary files. Nothing here ever leaves the browser.
 */
const DB_NAME = "memora-files";
const STORE = "originals";

interface StoredFile {
  lessonId: string;
  name: string;
  type: string;
  blob: Blob;
  savedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "lessonId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Best-effort: returns false if the browser refused (private mode, quota, ...). */
export async function saveOriginal(lessonId: string, file: File): Promise<boolean> {
  try {
    const record: StoredFile = { lessonId, name: file.name, type: file.type, blob: file, savedAt: Date.now() };
    await run("readwrite", (s) => s.put(record));
    return true;
  } catch (e) {
    console.warn("Memora: could not store the original file", e);
    return false;
  }
}

export async function getOriginal(lessonId: string): Promise<{ blob: Blob; name: string } | null> {
  try {
    const rec = await run<StoredFile | undefined>("readonly", (s) => s.get(lessonId));
    return rec ? { blob: rec.blob, name: rec.name } : null;
  } catch (e) {
    console.warn("Memora: could not read the original file", e);
    return null;
  }
}

export async function deleteOriginal(lessonId: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(lessonId));
  } catch {
    // nothing to clean up
  }
}
