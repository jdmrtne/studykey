import type { LessonChunk } from "../types/lesson";
import { renderChunks, JSON_ONLY_SYSTEM_SUFFIX } from "./shared";
import type { GenerateRequest } from "../lib/providers/types";

export interface GenerateReviewerOptions {
  chunks: LessonChunk[];
  lessonTitle: string;
  language?: string;
}

export function generateReviewerPrompt(opts: GenerateReviewerOptions): GenerateRequest {
  const { chunks, lessonTitle, language = "English" } = opts;

  const systemPrompt =
    "You are a study-reviewer generator. Condense the lesson into a structured summary a student can re-read " +
    "before an exam, organized by the lesson's own sections. Stay strictly grounded in the provided text. " +
    JSON_ONLY_SYSTEM_SUFFIX;

  const userPrompt = `Lesson content (chunked):

${renderChunks(chunks)}

---

Write a reviewer for "${lessonTitle}" in ${language}, organized into sections matching the lesson's structure.

Return JSON matching exactly this shape:
{
  "title": "${lessonTitle}",
  "sections": [
    {
      "heading": "...",
      "summary": "2-4 sentence summary of this section",
      "keyPoints": ["...", "..."],
      "source": { "section": "<matching chunk section>", "chunk": <matching chunk index> }
    }
  ]
}`;

  return { systemPrompt, userPrompt, jsonMode: true };
}
