export interface LessonChunk {
  id: string;
  index: number;
  /** Best-effort section heading this chunk falls under, if detected. */
  section: string;
  text: string;
}

export interface Lesson {
  id: string;
  title: string;
  createdAt: number;
  /** Raw cleaned text, kept for re-chunking if the user changes settings. */
  rawText: string;
  chunks: LessonChunk[];
  sourceFileName?: string;
}
