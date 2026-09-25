import type { DocxPageSetup } from "./docxPageSetup";
import { wrapDocxTables } from "./wrapTables";

/**
 * Splits sanitized DOCX HTML into discrete pages using *real layout
 * measurement* — never character counting. The sanitized HTML is mounted
 * off-screen at the document's true content width (so line-wrapping matches
 * what will actually be shown), then each top-level block (paragraph,
 * heading, list, table, image…) is measured and greedily packed into pages
 * without ever splitting a block across two pages. An explicit Word page
 * break (see docxToHtml's `br[type='page']` style map, rendered here as
 * `<hr class="docx-page-break">`) always forces a new page at that point.
 *
 * If a single block is taller than a full page (an oversized table, say),
 * it still gets its own page rather than being cut — that page just renders
 * taller than the rest, which is the honest browser-fallback answer to a
 * limitation the DOCX format itself doesn't fully resolve for us either.
 */
export async function paginateDocxHtml(html: string, setup: DocxPageSetup): Promise<string[]> {
  const contentWidth = Math.max(100, setup.widthPx - setup.marginLeftPx - setup.marginRightPx);
  const contentHeight = Math.max(100, setup.heightPx - setup.marginTopPx - setup.marginBottomPx);

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${contentWidth}px`;
  host.className = "memora-prose docx-page-content";
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    // Wrap oversized tables so they scroll horizontally rather than
    // overflowing the page, without touching tables that already fit.
    wrapDocxTables(host);

    // Tag whichever top-level block contains an explicit page-break marker
    // so the layout loop below can force a new page right before it.
    host.querySelectorAll(".docx-page-break").forEach((marker) => {
      let top: Element | null = marker;
      while (top && top.parentElement !== host) top = top.parentElement;
      top?.setAttribute("data-docx-break-before", "true");
    });

    await waitForImages(host);

    const children = Array.from(host.children) as HTMLElement[];
    if (children.length === 0) return [html];

    const pages: HTMLElement[][] = [];
    let current: HTMLElement[] = [];
    let pageStartTop: number | null = null;

    for (const child of children) {
      if (child.hasAttribute("data-docx-break-before") && current.length > 0) {
        pages.push(current);
        current = [];
        pageStartTop = null;
      }

      const top = child.offsetTop;
      const bottom = top + child.offsetHeight;
      if (pageStartTop === null) pageStartTop = top;
      const relativeBottom = bottom - pageStartTop;

      if (relativeBottom > contentHeight && current.length > 0) {
        pages.push(current);
        current = [];
        pageStartTop = top;
      }
      current.push(child);
    }
    if (current.length > 0) pages.push(current);

    const pageHtml = pages.map((blocks) => blocks.map((b) => b.outerHTML).join(""));
    return pageHtml.length > 0 ? pageHtml : [html];
  } finally {
    host.remove();
  }
}

/** Images are base64 data URIs (near-instant), but still decode async — wait briefly so heights are accurate before measuring. */
async function waitForImages(host: HTMLElement): Promise<void> {
  const imgs = Array.from(host.querySelectorAll("img"));
  if (imgs.length === 0) return;
  await Promise.race([
    Promise.allSettled(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 4000)),
  ]);
}
