import type { LessonChunk } from "../types/lesson";
import type { ChatMessage } from "../types/chat";
import type { GenerateRequest } from "../lib/providers/types";
import { renderChunks } from "./shared";
import { selectRelevantChunks } from "../lib/lessonSearch";

/** How many most-recent messages to replay back to the model as context. */
const HISTORY_WINDOW = 10;

export interface BuildChatPromptOptions {
  lessonTitle: string;
  chunks: LessonChunk[];
  /** Prior messages in this conversation, oldest first, NOT including the new question. */
  history: ChatMessage[];
  /** The student's latest message. */
  question: string;
}

export interface BuildChatPromptResult {
  request: GenerateRequest;
  /** Section headings of the chunks actually sent as context, for "From your lesson — Section: ..." UI. */
  usedSections: string[];
}

const SYSTEM_PROMPT = `You are Memora's lesson tutor, a focused study companion embedded in a student's app.

The student has a specific lesson open. That lesson is your PRIMARY and PREFERRED source of truth. Ground your
answers in the lesson excerpts you are given below whenever the topic is covered by them.

Rules you must follow:
- Answer using the provided lesson excerpts whenever they contain the answer. Prefer the lesson's own wording,
  examples, and framing over generic outside knowledge.
- Never invent information and present it as if it came from the lesson. Do not claim the lesson says something
  it does not say.
- If the lesson excerpts do not cover what the student is asking, say so plainly (e.g. "That's not covered in
  this lesson") before optionally adding brief general knowledge. Clearly mark general knowledge as going beyond
  the uploaded lesson — never blend it in as if it were from the lesson.
- You may simplify, re-explain, or give an outside example when the student asks for that, but stay honest about
  what is from the lesson versus general clarification.
- Do not paste large verbatim blocks of the lesson. Explain in your own words, in a way a student can actually
  study from.
- Keep answers tight and skimmable: short paragraphs, and bullet points or numbered steps for lists,
  comparisons, or step-by-step explanations. Avoid long unbroken walls of text.
- Do not repeat the entire lesson just because it's available to you — only use what's relevant to the question.
- If the student's question is empty, unclear, or off-topic for studying, ask a brief clarifying question instead
  of guessing.`;

function formatHistory(history: ChatMessage[]): string {
  const windowed = history.slice(-HISTORY_WINDOW).filter((m) => !m.pending && !m.error);
  if (windowed.length === 0) return "(no prior messages — this is the start of the conversation)";

  const omitted = history.length - windowed.length;
  const lines = windowed.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`);
  return (omitted > 0 ? `[${omitted} earlier message(s) omitted for brevity]\n` : "") + lines.join("\n\n");
}

export function buildChatPrompt(opts: BuildChatPromptOptions): BuildChatPromptResult {
  const { lessonTitle, chunks, history, question } = opts;

  const relevant = selectRelevantChunks(chunks, question, { maxChars: 6000, maxChunks: 6, minChunks: 2 });
  const usedSections = [...new Set(relevant.map((c) => c.section))];

  const lessonContext =
    relevant.length > 0
      ? renderChunks(relevant)
      : "(This lesson has no extractable text to search — answer based only on the lesson title and general knowledge, and say so.)";

  const userPrompt = `Lesson title: "${lessonTitle}"

Relevant excerpts from this lesson (there may be more content in the lesson that isn't shown here — these are
just the parts most relevant to the student's current question):

${lessonContext}

---

Conversation so far:

${formatHistory(history)}

---

Student's new question: ${question}

Answer the student's question now, following your system instructions. Reply in plain text only — no JSON, no
markdown code fences.`;

  return {
    request: { systemPrompt: SYSTEM_PROMPT, userPrompt, jsonMode: false },
    usedSections,
  };
}
