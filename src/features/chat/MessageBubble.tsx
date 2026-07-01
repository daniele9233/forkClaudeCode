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

function UserBubble({ message, parts }: { message: Message; parts: Part[] }) {
  const text = parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join("\n");

  const created = message.time?.created;
  const time = created
    ? new Date(created * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <div className="border border-[var(--border)]">
      <div className="flex items-center border-b border-[var(--border)]">
        <span className="bp-tab">user · {time}</span>
      </div>
      <div className="whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed text-[var(--foreground)]">
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
                className="mb-2 rounded-sm border-l-2 border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 text-xs italic text-[var(--muted-foreground)]"
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
          <div className="mt-2 rounded-sm border-l-2 border-[var(--color-alert)] bg-red-950/20 px-3 py-2 text-xs text-red-400">
            {getErrorMessage(error)}
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message, parts, isStreaming }: Props) {
  if (!message) return null;
  if (message.role === "user") {
    return <UserBubble message={message} parts={parts} />;
  }

  return (
    <AssistantBubble parts={parts} isStreaming={isStreaming} error={message.error} />
  );
}
