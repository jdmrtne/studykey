/**
 * Minimal, dependency-light PPTX reader (a .pptx is a zip of XML). It extracts slide
 * TEXT and structure only — it does not render slide artwork, layouts, animations
 * or media. Used for the "Slide Content" reader and for lesson text extraction.
 */
export interface SlideLine {
  text: string;
  /** Indent level (0 = top). */
  level: number;
  bullet: boolean;
}
export interface SlideContent {
  index: number; // 1-based, in presentation order
  title: string;
  lines: SlideLine[];
  notes: string;
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Invalid XML in PPTX");
  return doc;
}

function paragraphText(p: Element): string {
  let out = "";
  const walk = (node: Element) => {
    for (const child of Array.from(node.childNodes).filter((n) => n.nodeType === 1) as Element[]) {
      if (child.tagName === "a:t") out += child.textContent ?? "";
      else if (child.tagName === "a:br") out += "\n";
      else if (child.tagName === "a:r" || child.tagName === "a:fld") walk(child);
    }
  };
  walk(p);
  return out.trim();
}

function placeholderType(sp: Element): string | null {
  const ph = sp.getElementsByTagName("p:ph")[0];
  return ph ? (ph.getAttribute("type") ?? "body") : null;
}

function readSlide(xml: string, index: number): Omit<SlideContent, "notes"> {
  const doc = parseXml(xml);
  let title = "";
  const lines: SlideLine[] = [];

  for (const sp of Array.from(doc.getElementsByTagName("p:sp"))) {
    const type = placeholderType(sp);
    if (type === "sldNum" || type === "dt" || type === "ftr") continue; // footers, dates, numbers
    const isTitle = type === "title" || type === "ctrTitle";
    const isBodyPlaceholder = type !== null && !isTitle && type !== "subTitle";
    for (const p of Array.from(sp.getElementsByTagName("a:p"))) {
      const text = paragraphText(p);
      if (!text) continue;
      if (isTitle) {
        title = title ? `${title} ${text}` : text;
        continue;
      }
      const pPr = p.getElementsByTagName("a:pPr")[0];
      const level = Number(pPr?.getAttribute("lvl") ?? 0) || 0;
      const explicitNoBullet = !!p.getElementsByTagName("a:buNone")[0];
      const explicitBullet = !!(p.getElementsByTagName("a:buChar")[0] || p.getElementsByTagName("a:buAutoNum")[0]);
      lines.push({ text, level, bullet: explicitBullet || (isBodyPlaceholder && !explicitNoBullet) });
    }
  }

  // Tables: one line per row, cells separated by " | ".
  for (const tr of Array.from(doc.getElementsByTagName("a:tr"))) {
    const cells = Array.from(tr.getElementsByTagName("a:tc")).map((tc) =>
      Array.from(tc.getElementsByTagName("a:p")).map(paragraphText).filter(Boolean).join(" ")
    );
    if (cells.some(Boolean)) lines.push({ text: cells.join(" | "), level: 0, bullet: false });
  }

  return { index, title, lines };
}

function readNotes(xml: string): string {
  const doc = parseXml(xml);
  const parts: string[] = [];
  for (const sp of Array.from(doc.getElementsByTagName("p:sp"))) {
    if (placeholderType(sp) !== "body") continue;
    for (const p of Array.from(sp.getElementsByTagName("a:p"))) {
      const t = paragraphText(p);
      if (t) parts.push(t);
    }
  }
  return parts.join("\n");
}

function relTarget(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

export async function parsePptx(buffer: ArrayBuffer): Promise<SlideContent[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => zip.file(path)?.async("string") ?? null;

  // Slide order comes from presentation.xml (file names alone can be out of order).
  let slidePaths: string[] = [];
  const presXml = await read("ppt/presentation.xml");
  const presRels = await read("ppt/_rels/presentation.xml.rels");
  if (presXml && presRels) {
    const relMap = new Map<string, string>();
    for (const r of Array.from(parseXml(presRels).getElementsByTagName("Relationship"))) {
      relMap.set(r.getAttribute("Id") ?? "", relTarget("ppt/presentation.xml", r.getAttribute("Target") ?? ""));
    }
    for (const id of Array.from(parseXml(presXml).getElementsByTagName("p:sldId"))) {
      const target = relMap.get(id.getAttribute("r:id") ?? "");
      if (target) slidePaths.push(target);
    }
  }
  if (slidePaths.length === 0) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  }
  if (slidePaths.length === 0) throw new Error("No slides found in PPTX");

  const slides: SlideContent[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const xml = await read(path);
    if (!xml) continue;
    const base = readSlide(xml, i + 1);

    let notes = "";
    const relsPath = path.replace("slides/", "slides/_rels/") + ".rels";
    const rels = await read(relsPath);
    if (rels) {
      for (const r of Array.from(parseXml(rels).getElementsByTagName("Relationship"))) {
        if ((r.getAttribute("Type") ?? "").endsWith("/notesSlide")) {
          const nx = await read(relTarget(path, r.getAttribute("Target") ?? ""));
          if (nx) notes = readNotes(nx);
        }
      }
    }
    slides.push({ ...base, notes });
  }
  return slides;
}

/** Plain text for AI lesson generation. Keeps slide boundaries as headings. */
export function slidesToText(slides: SlideContent[]): string {
  return slides
    .map((s) => {
      const head = `## Slide ${s.index}${s.title ? `: ${s.title}` : ""}`;
      const body = s.lines.map((l) => `${"  ".repeat(l.level)}${l.bullet ? "- " : ""}${l.text}`).join("\n");
      const notes = s.notes ? `\nSpeaker notes: ${s.notes}` : "";
      return `${head}\n${body}${notes}`.trim();
    })
    .join("\n\n");
}
