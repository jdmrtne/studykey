const STARTERS = [
  "Explain this lesson simply",
  "What are the key concepts?",
  "Quiz me on this lesson",
  "What should I memorize?",
];

interface Props {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatStarterPrompts({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {STARTERS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(prompt)}
          className="px-3.5 py-2 min-h-[2.5rem] rounded-full text-[13px] font-semibold border-2 border-ink-3 bg-ink-2 text-paper/80 hover:border-signal/50 hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
