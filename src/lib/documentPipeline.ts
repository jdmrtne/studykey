import type { Lesson, LessonChunk } from "../types/lesson";
import type { OcrProgress } from "./ocr";

/**
 * UPLOAD -> EXTRACT TEXT -> CLEAN TEXT -> REMOVE DUPLICATES -> SPLIT INTO
 * CHUNKS, per architecture spec section 9. ANALYZE CHUNKS / CREATE LESSON
 * KNOWLEDGE happens later in aiService + prompts, once chunks exist.
 *
 * Extraction support: plain text, Markdown, PDF (pdf.js text layer first;
 * if a PDF has no text layer — e.g. it's a scan — each page is rasterized
 * and run through Tesseract.js OCR instead, see ./ocr.ts), and Word .docx
 * (mammoth). Anything else is rejected with a clear message rather than
 * silently mis-parsed.
 */

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];
const SUPPORTED_EXTENSIONS = [...TEXT_EXTENSIONS, ".pdf", ".docx", ".pptx"];

/** Progress updates surfaced while extracting a file — currently only emitted for OCR, which is the slow path. */
export type ExtractProgress = OcrProgress;

export async function extractText(file: File, onProgress?: (p: ExtractProgress) => void): Promise<string> {
  const name = file.name.toLowerCase();

  if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return await file.text();
  }

  if (name.endsWith(".pdf")) {
    return await extractPdfText(file, onProgress);
  }

  if (name.endsWith(".docx")) {
    return await extractDocxText(file);
  }

  if (name.endsWith(".pptx")) {
    return await extractPptxText(file);
  }

  if (name.endsWith(".ppt")) {
    throw new Error(
      `"${file.name}" is an old .ppt file — Memora can only read the newer .pptx format. ` +
        `Re-save it as .pptx in PowerPoint and re-upload, or paste the text directly.`
    );
  }

  if (name.endsWith(".doc")) {
    throw new Error(
      `"${file.name}" is an old .doc file — Memora can only read the newer .docx format. ` +
        `Re-save it as .docx in Word (or Google Docs) and re-upload, or paste the text directly.`
    );
  }

  throw new Error(
    `"${file.name}" isn't a supported format. Memora reads .txt, .md, .pdf, .docx, and .pptx files — ` +
      `for anything else, copy/paste the text into the lesson box instead.`
  );
}

async function extractPdfText(file: File, onProgress?: (p: ExtractProgress) => void): Promise<string> {
  // Lazy-loaded: pdf.js is a large dependency and most sessions never
  // touch a PDF, so it's kept out of the main bundle until needed.
  const [pdfjsLib, { default: pdfWorkerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(pageText);
  }

  const text = pages.join("\n\n").trim();
  if (text) return text;

  // No text layer at all — likely a scanned/image-only PDF. Fall back to OCR
  // rather than failing outright.
  const { ocrPdf } = await import("./ocr");
  const ocrText = await ocrPdf(file, onProgress);
  if (!ocrText) {
    throw new Error(
      `Couldn't find or recognize any text in "${file.name}", even with OCR. The scan may be too low-quality — ` +
        `try a clearer copy, or paste the text directly instead.`
    );
  }
  return ocrText;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  if (!result.value.trim()) {
    throw new Error(`Couldn't find any text in "${file.name}" — the document may be empty or image-only.`);
  }
  return result.value;
}

async function extractPptxText(file: File): Promise<string> {
  const { parsePptx, slidesToText } = await import("./pptx");
  const text = slidesToText(await parsePptx(await file.arrayBuffer()));
  if (!text.replace(/##[^\n]*/g, "").trim()) {
    throw new Error(`Couldn't find any text in "${file.name}" — the slides may contain only images.`);
  }
  return text;
}

export function isSupportedLessonFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Drops exact-duplicate paragraphs (common in copy-pasted lesson exports with repeated headers/footers). */
export function removeDuplicateParagraphs(text: string): string {
  const seen = new Set<string>();
  const paragraphs = text.split(/\n\n+/);
  const kept: string[] = [];
  for (const p of paragraphs) {
    const key = p.trim().toLowerCase();
    if (key.length > 0 && seen.has(key)) continue;
    if (key.length > 0) seen.add(key);
    kept.push(p);
  }
  return kept.join("\n\n");
}

export interface ChunkOptions {
  /** Approx. characters per chunk (rough stand-in for a token budget — ~4 chars/token). */
  targetChars?: number;
  overlapChars?: number;
}

/**
 * Splits cleaned text into chunks, trying to break on section headings
 * (Markdown `#`/`##` or ALL-CAPS / numbered lines) first so related
 * content stays together, then falling back to paragraph boundaries.
 * Keeps a small overlap between chunks so context isn't lost at a cut.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): LessonChunk[] {
  const targetChars = opts.targetChars ?? 3000;
  const overlapChars = opts.overlapChars ?? 200;

  const lines = text.split("\n");
  const headingPattern = /^(#{1,3}\s+.+|[A-Z][A-Z0-9 \-:]{6,}|(\d+[.)]\s+.+))$/;

  const sections: { heading: string; text: string }[] = [];
  let currentHeading = "Untitled section";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body) sections.push({ heading: currentHeading, text: body });
    buffer = [];
  };

  for (const line of lines) {
    if (headingPattern.test(line.trim()) && line.trim().length < 120) {
      flush();
      currentHeading = line.replace(/^#+\s*/, "").trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    sections.push({ heading: "Untitled section", text });
  }

  const chunks: LessonChunk[] = [];
  let index = 0;

  for (const section of sections) {
    let start = 0;
    const body = section.text;
    if (body.length <= targetChars) {
      chunks.push({ id: `c${index}`, index, section: section.heading, text: body });
      index++;
      continue;
    }
    while (start < body.length) {
      const end = Math.min(start + targetChars, body.length);
      const slice = body.slice(start, end);
      chunks.push({ id: `c${index}`, index, section: section.heading, text: slice });
      index++;
      start = end - overlapChars;
      if (start < 0 || end === body.length) break;
    }
  }

  return chunks;
}

export async function buildLessonFromFile(
  file: File,
  opts?: ChunkOptions,
  onProgress?: (p: ExtractProgress) => void
): Promise<Lesson> {
  const raw = await extractText(file, onProgress);
  return buildLessonFromText(file.name.replace(/\.[^.]+$/, ""), raw, file.name, opts);
}

export function buildLessonFromText(title: string, raw: string, sourceFileName?: string, opts?: ChunkOptions): Lesson {
  const cleaned = removeDuplicateParagraphs(cleanText(raw));
  const chunks = chunkText(cleaned, opts);
  return {
    id: crypto.randomUUID(),
    title: title || "Untitled lesson",
    createdAt: Date.now(),
    rawText: cleaned,
    chunks,
    sourceFileName,
  };
}

/** Rough estimate only — never shown to the user as a dollar figure (spec section 8: no fabricated pricing). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
