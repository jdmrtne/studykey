import { useState } from "react";
import { ProgressBar, ReaderNotice } from "./ReaderParts";

/** Web preview of a Word document. HTML is sanitized upstream (see resolveRenderer). Scroll only. */
export function DocxHtmlReader({ html }: { html: string }) {
  const [progress, setProgress] = useState(0);
  return (
    <>
      <ReaderNotice>This is a web preview. Some Word formatting may appear differently.</ReaderNotice>
      <ProgressBar value={progress} />
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          setProgress(max > 0 ? el.scrollTop / max : 1);
        }}
      >
        <article className="memora-prose max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}
