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

Write a reviewer for "${lessonTitle}" in ${language}, organized into sections matching the lesson's structure
(at most 8 sections; merge minor ones). It will be shown as a set of visual study cards, so write each field for
its specific card and keep everything concise. Only include an optional field when the lesson text genuinely
supports it — never pad or invent.

Return JSON matching exactly this shape:
{
  "title": "${lessonTitle}",
  "overview": "2-3 sentence big picture of the whole lesson",
  "mustKnow": ["3-5 short must-remember facts across the whole lesson"],
  "sections": [
    {
      "heading": "...",
      "summary": "1-3 sentence summary of this section",
      "keyPoints": ["3-5 short, scannable bullets (under ~20 words each)"],
      "keyTerms": [{ "term": "...", "definition": "short definition from the lesson" }],
      "remember": "ONE short memory hook: a mnemonic, rule of thumb or comparison (omit if none fits)",
      "watchOut": ["common mix-up or exam trap (0-2 items)"],
      "selfCheck": { "question": "one question answerable from this section", "answer": "brief answer" },
      "source": { "section": "<matching chunk section>", "chunk": <matching chunk index> }
    }
  ]
}

keyTerms may have 0-4 items, watchOut 0-2 items; leave them out (or use an empty array) when the section has none.`;

  return { systemPrompt, userPrompt, jsonMode: true };
}
