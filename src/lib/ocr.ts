/**
 * OCR fallback for scanned / image-only PDFs (no text layer for pdf.js to read).
 * Renders each page to a canvas with pdf.js, then runs it through Tesseract.js.
 *
 * Note: Tesseract.js downloads its WebAssembly engine + language data from a
 * CDN the first time it runs in a browser session (then caches it in
 * IndexedDB), so this step needs an internet connection on first use.
 */

export type OcrProgress =
  | { status: "loading" }
  | { status: "recognizing"; page: number; totalPages: number; pageProgress: number };

const RENDER_SCALE = 2.5; // upscale pages for sharper OCR input than a 1:1 render

export async function ocrPdf(file: File, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const [pdfjsLib, { default: pdfWorkerUrl }, { createWorker }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    import("tesseract.js"),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = doc.numPages;

  onProgress?.({ status: "loading" });

  let currentPage = 0;
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && currentPage > 0) {
        onProgress?.({ status: "recognizing", page: currentPage, totalPages, pageProgress: m.progress });
      }
    },
  });

  const canvas = document.createElement("canvas");

  try {
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      currentPage = pageNum;
      onProgress?.({ status: "recognizing", page: pageNum, totalPages, pageProgress: 0 });

      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;

      const { data } = await worker.recognize(canvas);
      pageTexts.push(data.text.trim());
    }
    return pageTexts.join("\n\n").trim();
  } finally {
    await worker.terminate();
  }
}
