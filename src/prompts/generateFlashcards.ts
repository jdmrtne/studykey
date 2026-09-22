import type { LessonChunk } from "../types/lesson";
import { renderChunks, JSON_ONLY_SYSTEM_SUFFIX } from "./shared";
import type { GenerateRequest } from "../lib/providers/types";

export interface GenerateFlashcardsOptions {
  chunks: LessonChunk[];
  cardCount: number;
  language?: string;
}

export function generateFlashcardsPrompt(opts: GenerateFlashcardsOptions): GenerateRequest {
  const { chunks, cardCount, language = "English" } = opts;

  const systemPrompt =
    "You are a flashcard generator for spaced-repetition study. Fronts should be short prompts/terms; backs " +
    "should be concise, self-contained answers grounded strictly in the provided lesson. " +
    JSON_ONLY_SYSTEM_SUFFIX;

  const userPrompt = `Lesson content (chunked):

${renderChunks(chunks)}

---

Generate exactly ${cardCount} flashcard(s) in ${language}, covering distinct facts spread across the lesson
(don't cluster all cards on one chunk if the lesson has multiple sections).

Return JSON matching exactly this shape:
{
  "cards": [
    {
      "id": "f1",
      "front": "...",
      "back": "...",
      "source": { "section": "<matching chunk section>", "chunk": <matching chunk index> }
    }
  ]
}`;

  return { systemPrompt, userPrompt, jsonMode: true };
}
