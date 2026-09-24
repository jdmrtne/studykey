import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";

interface QuickAction {
  label: string;
  buildPrompt: (draft: string) => string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Explain", buildPrompt: (d) => (d.trim() ? `Explain: ${d.trim()}` : "Explain this lesson.") },
  { label: "Summarize", buildPrompt: () => "Summarize this lesson." },
  { label: "Give an example", buildPrompt: (d) => (d.trim() ? `Give an example of: ${d.trim()}` : "Give an example from this lesson.") },
  { label: "Simplify", buildPrompt: (d) => (d.trim() ? `Simplify this in plain language: ${d.trim()}` : "Explain this lesson in the simplest possible language.") },
  { label: "Quiz me", buildPrompt: () => "Quiz me on this lesson." },
];

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex md:flex-wrap gap-2 scroll-x-touch -mx-4 px-4 md:mx-0 md:px-0">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={disabled}
            onClick={() => submit(action.buildPrompt(draft))}
            className="flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border border-ink-3 bg-ink-2 shadow-sm text-paper/60 hover:border-signal/50 hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2.5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask something about this lesson..."
          className="flex-1 resize-none max-h-40 rounded-2xl shadow-lg border-2 border-ink-3 bg-ink px-4 py-3 text-sm text-paper placeholder:text-paper/30 outline-none focus:border-signal transition-colors disabled:opacity-60"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
        />
        <button
          type="button"
          onClick={() => submit(draft)}
          disabled={disabled || !draft.trim()}
          aria-label="Send message"
          className={clsx(
            "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 touch-manipulation",
            "bg-signal text-night hover:bg-signal-dim active:scale-[0.95]",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
