export interface SourceRef {
  section: string;
  chunk: number;
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "identification";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  source: SourceRef;
}

export interface QuizSet {
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  source: SourceRef;
}

export interface FlashcardSet {
  cards: Flashcard[];
}

export interface ReviewerTerm {
  term: string;
  definition: string;
}

export interface ReviewerSection {
  heading: string;
  summary: string;
  keyPoints: string[];
  /** Vocabulary defined in this section. Optional — older or sparser AI output may omit it. */
  keyTerms?: ReviewerTerm[];
  /** One short memory hook (mnemonic, rule of thumb, comparison). */
  remember?: string;
  /** Common mix-ups or exam traps for this section. */
  watchOut?: string[];
  /** One question the student can answer from memory, then reveal the answer. */
  selfCheck?: { question: string; answer: string };
  source: SourceRef;
}

export interface Reviewer {
  title: string;
  /** 2-3 sentence big picture of the whole lesson. */
  overview?: string;
  /** The handful of things that must not be forgotten. */
  mustKnow?: string[];
  sections: ReviewerSection[];
}

// --- Runtime validators -----------------------------------------------
// Used by aiService.generateJSON before anything is rendered (spec
// section 12: "Never render malformed AI output").

function isSourceRef(v: unknown): v is SourceRef {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as SourceRef).section === "string" &&
    typeof (v as SourceRef).chunk === "number"
  );
}

export function isQuizSet(v: unknown): v is QuizSet {
  if (typeof v !== "object" || v === null || !Array.isArray((v as QuizSet).questions)) return false;
  return (v as QuizSet).questions.every(
    (q) =>
      q &&
      typeof q.id === "string" &&
      ["multiple_choice", "true_false", "identification"].includes(q.type) &&
      typeof q.question === "string" &&
      typeof q.answer === "string" &&
      typeof q.explanation === "string" &&
      isSourceRef(q.source) &&
      (q.options === undefined || Array.isArray(q.options))
  );
}

export function isFlashcardSet(v: unknown): v is FlashcardSet {
  if (typeof v !== "object" || v === null || !Array.isArray((v as FlashcardSet).cards)) return false;
  return (v as FlashcardSet).cards.every(
    (c) => c && typeof c.id === "string" && typeof c.front === "string" && typeof c.back === "string" && isSourceRef(c.source)
  );
}

export function isReviewer(v: unknown): v is Reviewer {
  if (typeof v !== "object" || v === null || typeof (v as Reviewer).title !== "string" || !Array.isArray((v as Reviewer).sections))
    return false;
  return (v as Reviewer).sections.every(
    (s) =>
      s &&
      typeof s.heading === "string" &&
      typeof s.summary === "string" &&
      Array.isArray(s.keyPoints) &&
      isSourceRef(s.source) &&
      // The extras are optional; the renderer defensively ignores malformed entries, so only reject
      // values that are the wrong *kind* of thing entirely.
      (s.keyTerms === undefined || Array.isArray(s.keyTerms)) &&
      (s.watchOut === undefined || Array.isArray(s.watchOut))
  );
}
