import type { LessonChunk } from "../types/lesson";
import { renderChunks, JSON_ONLY_SYSTEM_SUFFIX } from "./shared";
import type { GenerateRequest } from "../lib/providers/types";

export interface GenerateQuizOptions {
  chunks: LessonChunk[];
  questionCount: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  questionTypes: Array<"multiple_choice" | "true_false" | "identification">;
  language?: string;
}

export function generateQuizPrompt(opts: GenerateQuizOptions): GenerateRequest {
  const { chunks, questionCount, difficulty, questionTypes, language = "English" } = opts;

  const systemPrompt =
    "You are a study-quiz generator. Every question you write must be answerable strictly from the provided " +
    "lesson chunks — never invent facts not present in the source. " +
    JSON_ONLY_SYSTEM_SUFFIX;

  const userPrompt = `Lesson content (chunked):

${renderChunks(chunks)}

---

Generate exactly ${questionCount} quiz question(s) in ${language}.
Difficulty: ${difficulty}.
Allowed question types: ${questionTypes.join(", ")}.

Return JSON matching exactly this shape:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice" | "true_false" | "identification",
      "question": "...",
      "options": ["...", "...", "...", "..."],   // omit for identification/true_false
      "answer": "...",
      "explanation": "...",
      "source": { "section": "<matching chunk section>", "chunk": <matching chunk index> }
    }
  ]
}

Every question's "source" must point to the actual chunk index/section the fact came from.`;

  return { systemPrompt, userPrompt, jsonMode: true };
}
