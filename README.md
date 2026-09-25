# Memora — AI Study Companion

**Live:** https://sitememora.vercel.app/

Upload or paste a lesson, then generate reviewers, quizzes, and flashcards
using **your own** AI provider API key. No AI credits are provided by this
app and no key is ever sent to a Memora server — it's client-side only,
and everything talks directly from your browser to the provider you pick.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4. UI kit and design-token
approach ported from PinoyQuiz and re-themed. State via Zustand.
No backend — this is a static site.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL, go to **AI Settings**, and connect an
Anthropic, OpenAI, Gemini, OpenRouter, or custom OpenAI-compatible key.

## Project structure

```
src/
  lib/
    providers/        One adapter per AI provider (anthropic, openai,
                       gemini, openrouter, custom) implementing a shared
                       ProviderAdapter interface — see providers/types.ts
    aiService.ts       The only module the rest of the app calls into;
                       handles JSON-mode generation + schema validation
                       + one repair retry before failing
    storage.ts         localStorage persistence, honors "remember key"
    documentPipeline.ts Upload -> extract -> clean -> dedupe -> chunk
  prompts/             One template per generation type (quiz, flashcards,
                       reviewer), all grounded in chunk citations
  store/               Zustand stores: AI settings, lessons
  components/
    ui/                Ported design-system primitives (Button, Card, ...)
    ai/                AI-specific shared bits (lesson picker, error
                       notice, "not configured" banner)
    layout/            App shell + nav
  pages/               Dashboard, Lessons, Quiz, Flashcards, Reviewer,
                       AI Settings, Settings
  types/               Lesson/chunk types, quiz/flashcard/reviewer types
                       + runtime validators (no schema library dependency)
```

## Known limitations (honest, not hidden)

- **File formats**: `.txt`, `.md`, `.pdf`, and `.docx` are supported.
  PDFs are parsed with pdf.js (text layer only — scanned/image-only PDFs
  won't yield text, since there's no OCR here) and `.docx` with mammoth.
  Old `.doc` files need to be re-saved as `.docx` first. Both parsers are
  lazy-loaded so they don't bloat the initial bundle for people who never
  upload one.
- **OpenAI CORS**: OpenAI's API does not enable CORS for arbitrary
  browser origins, so direct calls from this client-side app may fail
  even with a valid key. If that happens, use the "Other (OpenAI-
  compatible)" provider pointed at a local proxy, or run this behind a
  backend. Anthropic, Gemini, and OpenRouter work directly from the
  browser.
- **Lesson knowledge consolidation** (spec section 9's "CREATE LESSON
  KNOWLEDGE" step) is currently just chunking + direct generation from
  chunks — there's no separate cross-chunk analysis/consolidation pass
  yet for very long lessons spanning many chunks.
- No dedicated PDF/DOCX viewer, no export (print/PDF/Anki) yet.

## Privacy

Lesson text and prompts are sent directly to whichever provider you
configure, only when you click Generate. Nothing is uploaded to a
Memora server — there isn't one.
