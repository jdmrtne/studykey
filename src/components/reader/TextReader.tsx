import { useRef, useState } from "react";
import { ProgressBar } from "./ReaderParts";

export function TextReader({ text }: { text: string }) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      <ProgressBar value={progress} />
      <div
        ref={ref}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          setProgress(max > 0 ? el.scrollTop / max : 1);
        }}
      >
        <article className="max-w-3xl mx-auto text-[15px] leading-7 flex flex-col gap-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </article>
      </div>
    </>
  );
}
