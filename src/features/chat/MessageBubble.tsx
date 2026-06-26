import { cn } from "@/lib/utils";
import type {
  Message,
  AssistantMessage,
  Part,
  TextPart,
  ToolPart,
  ReasoningPart,
} from "@opencode-ai/sdk/client";
import { MarkdownContent } from "./MarkdownContent";
import { ToolCallCard } from "./ToolCallCard";

interface Props {
  message: Message;
  parts: Part[];
  isStreaming?: boolean;
}

function isTextPart(p: Part): p is TextPart {
  return p.type === "text";
}

function isToolPart(p: Part): p is ToolPart {
  return p.type === "tool";
}

function isReasoningPart(p: Part): p is ReasoningPart {
  return p.type === "reasoning";
}

function getErrorMessage(error: AssistantMessage["error"]): string {
  if (!error) return "";
  const data = error.data as Record<string, unknown>;
  return typeof data.message === "string" ? data.message : error.name;
}

function UserBubble({ parts }: { parts: Part[] }) {
  const text = parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join("\n");

  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5",
          "bg-[var(--primary)] text-[var(--primary-foreground)]",
          "text-sm leading-relaxed whitespace-pre-wrap",
        )}
      >
        {text}
      </div>
    </div>
  );
}

interface AssistantBubbleProps {
  parts: Part[];
  isStreaming?: boolean;
  error?: AssistantMessage["error"];
}

function AssistantBubble({ parts, isStreaming, error }: AssistantBubbleProps) {
  const visibleParts = parts.filter(
    (p) => isTextPart(p) || isToolPart(p) || isReasoningPart(p),
  );

  const hasContent = visibleParts.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] min-w-0">
        {!hasContent && isStreaming && (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-sm py-1">
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        {visibleParts.map((part) => {
          if (isTextPart(part)) {
            const isLastPart = visibleParts[visibleParts.length - 1] === part;
            return (
              <MarkdownContent
                key={part.id}
                content={part.text}
                streaming={isStreaming && isLastPart}
              />
            );
          }
          if (isReasoningPart(part)) {
            return (
              <div
                key={part.id}
                className="mb-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 text-xs text-[var(--muted-foreground)] italic"
              >
                {part.text}
              </div>
            );
          }
          if (isToolPart(part)) {
            return <ToolCallCard key={part.id} part={part} />;
          }
          return null;
        })}
        {error && (
          <div className="mt-2 rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            {getErrorMessage(error)}
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message, parts, isStreaming }: Props) {
  if (message.role === "user") {
    return <UserBubble parts={parts} />;
  }

  return (
    <AssistantBubble
      parts={parts}
      isStreaming={isStreaming}
      error={message.error}
    />
  );
}
