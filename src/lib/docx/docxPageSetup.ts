/**
 * Reads the page size, orientation, and margins Word actually saved for this
 * document (from `word/document.xml`'s `<w:sectPr>`), so the paginated DOCX
 * reader can lay out pages at the document's real dimensions instead of a
 * guessed one-size-fits-all page. Falls back to a standard Letter page with
 * 1" margins if the document has no section properties or can't be parsed.
 *
 * DOCX stores lengths in twips (1/1440 inch). We convert to CSS px at the
 * standard 96dpi so 1in == 96px, matching how the rest of the reader UI
 * already measures things.
 */

const TWIPS_PER_INCH = 1440;
const CSS_PX_PER_INCH = 96;
const twipsToPx = (twips: number) => (twips / TWIPS_PER_INCH) * CSS_PX_PER_INCH;

export interface DocxPageSetup {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  orientation: "portrait" | "landscape";
}

const LETTER_PORTRAIT: DocxPageSetup = {
  widthPx: twipsToPx(12240),
  heightPx: twipsToPx(15840),
  marginTopPx: twipsToPx(1440),
  marginRightPx: twipsToPx(1440),
  marginBottomPx: twipsToPx(1440),
  marginLeftPx: twipsToPx(1440),
  orientation: "portrait",
};

function attr(tag: string, name: string): number | undefined {
  const m = tag.match(new RegExp(`w:${name}="(-?\\d+)"`));
  return m ? Number(m[1]) : undefined;
}

export async function getDocxPageSetup(buffer: ArrayBuffer): Promise<DocxPageSetup> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) return LETTER_PORTRAIT;

    // Use the document's last section properties — for the common
    // single-section document, that's also the only one.
    const sectMatches = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g);
    const sectPr = sectMatches?.[sectMatches.length - 1];
    if (!sectPr) return LETTER_PORTRAIT;

    const pgSzMatch = sectPr.match(/<w:pgSz[^/]*\/>/);
    const pgMarMatch = sectPr.match(/<w:pgMar[^/]*\/>/);
    if (!pgSzMatch) return LETTER_PORTRAIT;

    const w = attr(pgSzMatch[0], "w") ?? 12240;
    const h = attr(pgSzMatch[0], "h") ?? 15840;
    const landscape = /w:orient="landscape"/.test(pgSzMatch[0]) || w > h;

    const marTop = pgMarMatch ? (attr(pgMarMatch[0], "top") ?? 1440) : 1440;
    const marRight = pgMarMatch ? (attr(pgMarMatch[0], "right") ?? 1440) : 1440;
    const marBottom = pgMarMatch ? (attr(pgMarMatch[0], "bottom") ?? 1440) : 1440;
    const marLeft = pgMarMatch ? (attr(pgMarMatch[0], "left") ?? 1440) : 1440;

    return {
      widthPx: twipsToPx(w),
      heightPx: twipsToPx(h),
      marginTopPx: twipsToPx(marTop),
      marginRightPx: twipsToPx(marRight),
      marginBottomPx: twipsToPx(marBottom),
      marginLeftPx: twipsToPx(marLeft),
      orientation: landscape ? "landscape" : "portrait",
    };
  } catch (e) {
    console.error("Memora: could not read DOCX page setup, using Letter default", e);
    return LETTER_PORTRAIT;
  }
}

export { LETTER_PORTRAIT };
