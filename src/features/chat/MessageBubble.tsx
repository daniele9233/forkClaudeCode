import { memo, useState } from "react";
import { Undo2, Loader2 } from "lucide-react";
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
import { parseSkills, skillById } from "@/skills/match";
import { useRevertSession } from "@/opencode/session";

/**
 * "Rewind to this prompt" — reverts the session to this user message, undoing
 * every task after it (files + conversation). Reversible from the Timeline tab
 * (Unrevert). Two-step so it isn't triggered by accident.
 */
function RewindButton({
  sessionId,
  messageId,
}: {
  sessionId: string;
  messageId: string;
}) {
  const revert = useRevertSession();
  const [armed, setArmed] = useState(false);

  if (!sessionId) return null;

  const doRevert = async () => {
    try {
      await revert.mutateAsync({ sessionId, messageId });
    } finally {
      setArmed(false);
    }
  };

  return (
    <button
      onClick={armed ? doRevert : () => setArmed(true)}
      onBlur={() => setArmed(false)}
      disabled={revert.isPending}
      title="Rewind the session to this prompt (undo everything after — reversible from Timeline)"
      className="mr-1.5 flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {revert.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Undo2 className="h-3 w-3" />
      )}
      {armed ? "Rewind here?" : "Rewind"}
    </button>
  );
}

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
  const rawText = parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join("\n");
  // Strip any injected skill playbooks and surface them as badges instead.
  const { clean: text, skillIds } = parseSkills(rawText);

  const created = message.time?.created;
  const time = created
    ? new Date(created * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <div className="rounded-r-sm border border-[var(--border)] border-l-2 border-l-[var(--chat-user-accent)] bg-[var(--chat-user-bg)]">
      <div className="flex items-center border-b border-[var(--border)]">
        <span className="bp-tab font-semibold text-[var(--chat-user-accent)]">
          user · {time}
        </span>
        {message.sessionID && (
          <div className="ml-auto">
            <RewindButton sessionId={message.sessionID} messageId={message.id} />
          </div>
        )}
      </div>
      {skillIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] px-3.5 py-1.5">
          {skillIds.map((id) => {
            const s = skillById(id);
            return (
              <span
                key={id}
                title={s?.description}
                className="flex items-center gap-1 rounded-sm bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]"
              >
                {s?.emoji ?? "⚡"} {s?.name ?? id}
              </span>
            );
          })}
        </div>
      )}
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

  // "Content" the user can actually SEE. A reasoning/text part with empty text
  // (reasoning models and the GLM/zai free tier emit these) doesn't count — so
  // the thinking indicator stays up instead of leaving a blank, frozen-looking
  // bubble ("pensa pensa ma non vedo nulla").
  const hasVisibleContent = visibleParts.some((p) => {
    if (isToolPart(p)) return true;
    if (isTextPart(p) || isReasoningPart(p)) return (p.text ?? "").trim().length > 0;
    return false;
  });

  return (
    <div className="flex justify-start">
      {/* Role-tinted container so the model's answer is visually distinct from
          the user's amber question box (works in light and dark). */}
      <div className="max-w-[85%] min-w-0 rounded-r-sm border-l-2 border-l-[var(--chat-agent-accent)] bg-[var(--chat-agent-bg)] px-3 py-2">
        <span className="hud-label mb-1 block font-semibold text-[var(--chat-agent-accent)]">
          agent
        </span>
        {!hasVisibleContent && isStreaming && (
          <div className="flex items-center gap-2 py-1 text-sm text-[var(--muted-foreground)]">
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <span className="hud-label opacity-70">thinking…</span>
          </div>
        )}
        {visibleParts.map((part) => {
          if (isTextPart(part)) {
            if (!(part.text ?? "").trim()) return null;
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
            // Skip empty reasoning parts — they'd render as a blank box that
            // reads as "stuck". The thinking indicator covers this state.
            if (!(part.text ?? "").trim()) return null;
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

// Memoized: during streaming only the message being updated gets new
// `message`/`parts` references (MessageList keeps them stable via a WeakMap
// cache), so every other bubble skips its re-render — no more full-list
// re-paint on every token.
export const MessageBubble = memo(function MessageBubble({
  message,
  parts,
  isStreaming,
}: Props) {
  if (!message) return null;
  if (message.role === "user") {
    return <UserBubble message={message} parts={parts} />;
  }

  return (
    <AssistantBubble parts={parts} isStreaming={isStreaming} error={message.error} />
  );
});
