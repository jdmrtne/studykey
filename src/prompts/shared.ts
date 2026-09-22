import type { LessonChunk } from "../types/lesson";

/**
 * Every prompt template renders chunks the same way, so the model always
 * sees the same {section, chunk index, text} shape it's asked to cite
 * back in `source` — this is what makes grounding / "View Source"
 * possible (spec section 10).
 */
export function renderChunks(chunks: LessonChunk[]): string {
  return chunks
    .map((c) => `[chunk ${c.index} | section: ${c.section}]\n${c.text}`)
    .join("\n\n---\n\n");
}

export const JSON_ONLY_SYSTEM_SUFFIX =
  "Respond with ONLY valid JSON matching the schema described. No prose, no markdown fences, no commentary.";
