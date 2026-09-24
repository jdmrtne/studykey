/**
 * Splits sanitized DOCX HTML (see resolveRenderer's docxToHtml) into page-sized chunks
 * so DocxHtmlReader can offer the same page-by-page navigation as PptxSlidesReader.
 *
 * Word documents have no built-in "slide" boundary, so we approximate one:
 *   - a new page starts at each top-level heading (h1/h2)
 *   - if the document has no headings (or a stretch is heading-free), pages are
 *     chunked every MAX_BLOCKS_PER_PAGE top-level elements instead
 */
const MAX_BLOCKS_PER_PAGE = 8;

export function paginateHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.children);
  if (nodes.length === 0) return html.trim() ? [html] : [];

  const pages: Element[][] = [];
  let current: Element[] = [];

  for (const node of nodes) {
    const isHeading = node.tagName === "H1" || node.tagName === "H2";
    const shouldBreak = (isHeading && current.length > 0) || current.length >= MAX_BLOCKS_PER_PAGE;
    if (shouldBreak) {
      pages.push(current);
      current = [];
    }
    current.push(node);
  }
  if (current.length > 0) pages.push(current);

  return pages.map((els) => els.map((el) => el.outerHTML).join(""));
}
