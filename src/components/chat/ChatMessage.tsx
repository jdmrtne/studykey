import clsx from "clsx";
import { BookOpen, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../../types/chat";
import { Button } from "../ui/Button";

interface Props {
  message: ChatMessageType;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]", isUser && "items-end")}>
        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-signal text-night rounded-br-md"
              : "bg-ink-2 border border-ink-3 text-paper rounded-bl-md"
          )}
        >
          {message.pending ? (
            <span className="flex items-center gap-2 text-paper/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </span>
          ) : message.error ? (
            <span className="flex items-start gap-2 text-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message.error}</span>
            </span>
          ) : (
            message.content
          )}
        </div>

        {!isUser && message.error && onRetry && (
          <Button variant="ghost" size="md" onClick={onRetry} className="!px-3 !py-1.5 !text-xs self-start">
            <RefreshCw className="w-3 h-3 mr-1.5 inline" />
            Retry
          </Button>
        )}

        {!isUser && !message.pending && !message.error && message.sources && message.sources.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-paper/40 px-1">
            <BookOpen className="w-3 h-3 flex-shrink-0" />
            From your lesson — {message.sources.slice(0, 3).join(", ")}
            {message.sources.length > 3 ? ", ..." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
