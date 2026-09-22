const STARTERS = [
  "Explain this lesson simply",
  "What are the key concepts?",
  "Quiz me on this lesson",
  "Explain the hardest part",
  "What should I memorize?",
  "What does this term mean?",
];

interface Props {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatStarterPrompts({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-paper/50 text-center">Not sure where to start? Try one of these:</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {STARTERS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="px-4 py-2.5 min-h-[2.75rem] rounded-full text-sm font-semibold border-2 border-ink-3 bg-ink-2 text-paper/80 hover:border-signal/50 hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
