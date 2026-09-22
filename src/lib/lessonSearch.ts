import type { LessonChunk } from "../types/lesson";

/**
 * A dependency-free, local "search" over a lesson's chunks so Chat can
 * ground each answer in the handful of chunks actually relevant to the
 * question instead of re-sending the entire lesson on every message
 * (spec section 4 — "handle long lessons properly"). This intentionally
 * does not reach for a vector database: for a single lesson's worth of
 * chunks (typically a few dozen), a keyword/overlap score is fast,
 * has zero setup cost, and is easy to reason about.
 *
 * The approach is a small bag-of-words scorer: term frequency in the
 * chunk, weighted up for terms that also appear in the chunk's section
 * heading (a heading match is a strong relevance signal), with a mild
 * length-normalization so short chunks aren't unfairly favored.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "as", "by", "with", "from", "about", "what", "why",
  "how", "when", "where", "who", "which", "does", "do", "did", "can", "could",
  "would", "should", "will", "i", "you", "your", "my", "me", "we", "explain",
  "please", "tell", "give", "me", "than", "then", "so", "if", "not", "just",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9'-]*/g)
    ?.filter((t) => t.length > 1 && !STOPWORDS.has(t)) ?? [];
}

export interface ScoredChunk {
  chunk: LessonChunk;
  score: number;
}

/**
 * Ranks every chunk by relevance to `query` and returns them best-first.
 * Callers typically take the top N (see `selectRelevantChunks`).
 */
export function rankChunksByRelevance(chunks: LessonChunk[], query: string): ScoredChunk[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return chunks.map((chunk) => ({ chunk, score: 0 }));
  }

  const scored = chunks.map((chunk) => {
    const bodyTerms = tokenize(chunk.text);
    const headingTerms = new Set(tokenize(chunk.section));
    if (bodyTerms.length === 0) return { chunk, score: 0 };

    const bodyCounts = new Map<string, number>();
    for (const t of bodyTerms) bodyCounts.set(t, (bodyCounts.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const count = bodyCounts.get(term) ?? 0;
      if (count === 0) continue;
      // Diminishing returns per extra occurrence, so one chunk that just
      // repeats a word a lot doesn't drown out chunks with broader coverage.
      score += Math.sqrt(count);
      if (headingTerms.has(term)) score += 1.5;
    }
    // Mild normalization so very long chunks don't win purely on length.
    score = score / Math.sqrt(bodyTerms.length / 100 + 1);

    return { chunk, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export interface SelectRelevantChunksOptions {
  /** Stop adding chunks once this many characters have been gathered. */
  maxChars?: number;
  /** Hard cap on number of chunks, regardless of character budget. */
  maxChunks?: number;
  /** Always include at least this many top chunks, even for a low-signal query. */
  minChunks?: number;
}

/**
 * Selects the most relevant chunks for a chat question, respecting a
 * character budget so the prompt stays well within the model's context
 * window even for long lessons. Falls back to the lesson's first few
 * chunks when nothing scores above zero (e.g. a vague "explain this"
 * question with no distinctive terms), so the model still gets grounded
 * context rather than nothing.
 */
export function selectRelevantChunks(
  chunks: LessonChunk[],
  query: string,
  opts: SelectRelevantChunksOptions = {}
): LessonChunk[] {
  const { maxChars = 6000, maxChunks = 6, minChunks = 2 } = opts;
  if (chunks.length === 0) return [];

  const ranked = rankChunksByRelevance(chunks, query);
  const anySignal = ranked.some((r) => r.score > 0);

  const ordered = anySignal
    ? ranked.map((r) => r.chunk)
    : [...chunks].sort((a, b) => a.index - b.index);

  const selected: LessonChunk[] = [];
  let chars = 0;
  for (const chunk of ordered) {
    if (selected.length >= maxChunks) break;
    if (selected.length >= minChunks && chars + chunk.text.length > maxChars) break;
    selected.push(chunk);
    chars += chunk.text.length;
  }

  // Keep lesson order in the final prompt — easier for the model (and a
  // human reading "View source") to follow than relevance order.
  return selected.sort((a, b) => a.index - b.index);
}
