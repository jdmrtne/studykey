import type { Lesson } from "../../types/lesson";
import type { SlideContent } from "../pptx";
import { getDocxPageSetup, type DocxPageSetup } from "../docx/docxPageSetup";

/**
 * Picks the best available reader for a lesson and automatically falls through
 * to the next one on failure. Technical errors are logged for developers only.
 *
 *   PDF   -> PDF reader
 *   DOCX  -> (server PDF, if configured) -> paginated document view (Mammoth) -> plain HTML -> text -> failed
 *   PPTX  -> (server PDF, if configured) -> slide content   -> failed
 *   text  -> text reader
 */
export type FileKind = "pdf" | "docx" | "pptx" | "text";

export type ReaderSource =
  | { mode: "pdf"; data: ArrayBuffer; converted: boolean }
  | { mode: "docx-html"; html: string; pageSetup: DocxPageSetup }
  | { mode: "pptx-slides"; slides: SlideContent[] }
  | { mode: "text"; text: string; reason: "plain" | "docx-fallback" | "pdf-fallback" | "pptx-fallback" | "no-original" }
  | { mode: "failed"; kind: FileKind };

export function detectKind(fileName?: string): FileKind {
  const n = (fileName ?? "").toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".pptx")) return "pptx";
  return "text";
}

/**
 * Optional server-side DOCX/PPTX -> PDF conversion. Memora is client-only today, so this is
 * OFF unless VITE_DOC_CONVERSION_URL points at a service YOU control that accepts a POSTed
 * file and returns application/pdf. Private documents are never sent anywhere otherwise.
 */
async function tryServerConversion(blob: Blob, name: string): Promise<ArrayBuffer | null> {
  const url = import.meta.env.VITE_DOC_CONVERSION_URL as string | undefined;
  if (!url) return null;
  try {
    const form = new FormData();
    form.append("file", blob, name);
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) throw new Error(`Conversion failed (${res.status})`);
    return await res.arrayBuffer();
  } catch (e) {
    console.error("Memora: server conversion failed, using browser fallback", e);
    return null;
  }
}

// Mammoth's own conversion doesn't preserve much beyond semantic structure
// (headings, bold/italic/underline, lists, tables) by design — direct
// formatting like custom colors/alignment/indentation isn't recoverable
// without a full from-scratch OOXML renderer, which is out of scope here.
// The one thing worth special-casing is explicit page breaks: `br[type='page']`
// is a documented mammoth style-map matcher, so we turn each one into a
// `<hr class="docx-page-break">` marker that paginateDocxHtml (see
// lib/docx/paginateDocx.ts) uses to force a new page at that exact point,
// instead of losing the break entirely (mammoth drops it otherwise).
const DOCX_STYLE_MAP = ["br[type='page'] => hr.docx-page-break:fresh"];

const IMAGE_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160">' +
      '<rect width="100%" height="100%" fill="#e7e7ec" stroke="#c7c7d2"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#7a7a86" text-anchor="middle" dominant-baseline="middle">Image could not be previewed</text>' +
      "</svg>"
  );

async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
  const [mammoth, { default: DOMPurify }] = await Promise.all([import("mammoth"), import("dompurify")]);
  // Images embed as base64 data URIs by default (mammoth.images.dataUri);
  // wrap that so a single unreadable image degrades to a labeled
  // placeholder instead of silently vanishing from the document.
  const convertImage = mammoth.images.imgElement((image) =>
    image
      .readAsBase64String()
      .then((imageBuffer) => ({ src: `data:${image.contentType};base64,${imageBuffer}` }))
      .catch((e) => {
        console.error("Memora: DOCX image could not be converted", e);
        return { src: IMAGE_PLACEHOLDER_SVG };
      })
  );
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, { styleMap: DOCX_STYLE_MAP, convertImage });
  if (!result.value.trim()) throw new Error("DOCX produced no HTML");
  // Uploaded documents are untrusted: strip scripts, handlers and javascript: links.
  const clean = DOMPurify.sanitize(result.value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "iframe", "object", "embed"],
  });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
  return doc.body.innerHTML;
}

async function docxToText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  if (!value.trim()) throw new Error("DOCX has no text");
  return value;
}

export async function resolveRenderer(
  lesson: Lesson,
  original: { blob: Blob; name: string } | null,
  opts: { skipServer?: boolean } = {}
): Promise<ReaderSource> {
  const kind = detectKind(lesson.sourceFileName);

  if (kind === "text") return { mode: "text", text: lesson.rawText, reason: "plain" };

  // Lessons uploaded before originals were kept only have their extracted text.
  if (!original) return { mode: "text", text: lesson.rawText, reason: "no-original" };

  let buffer: ArrayBuffer;
  try {
    buffer = await original.blob.arrayBuffer();
  } catch (e) {
    console.error("Memora: could not read stored original", e);
    return { mode: "failed", kind };
  }

  if (kind === "pdf") return { mode: "pdf", data: buffer, converted: false };

  const converted = opts.skipServer ? null : await tryServerConversion(original.blob, original.name);
  if (converted) return { mode: "pdf", data: converted, converted: true };

  if (kind === "docx") {
    try {
      const [html, pageSetup] = await Promise.all([docxToHtml(buffer), getDocxPageSetup(buffer)]);
      return { mode: "docx-html", html, pageSetup };
    } catch (e) {
      console.error("Memora: DOCX -> HTML failed", e);
    }
    try {
      return { mode: "text", text: await docxToText(buffer), reason: "docx-fallback" };
    } catch (e) {
      console.error("Memora: DOCX text extraction failed", e);
    }
    return { mode: "failed", kind };
  }

  // pptx
  try {
    const { parsePptx } = await import("../pptx");
    const slides = await parsePptx(buffer);
    if (slides.some((s) => s.title || s.lines.length)) return { mode: "pptx-slides", slides };
    throw new Error("No text content in slides");
  } catch (e) {
    console.error("Memora: PPTX content extraction failed", e);
    return { mode: "failed", kind };
  }
}
