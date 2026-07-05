import type { AssistantMessage } from "@opencode-ai/sdk/client";
import { getClient } from "./client";
import { rowInfo } from "./messageShape";
import { runDesignAudit } from "./audit";
import { useAutopilotStore } from "@/stores/autopilot.store";
import { useChatStore } from "@/stores/chat.store";
import { useModelStore, splitModel } from "@/stores/model.store";
import { usePreviewStore } from "@/stores/preview.store";
import { notifyWhenUnfocused } from "@/lib/notify";

/**
 * Autopilot: goal + cost budget + iteration cap. kikkoCode keeps nudging the
 * agent ("continue") every time the session goes idle, until the agent declares
 * the goal achieved (DONE marker), the budget is burned, or the caps hit.
 * The Cost Guard data (per-message cost from the engine) is the fuel gauge.
 */

const DONE_MARKER = "AUTOPILOT_DONE";

function autopilotPreamble(goal: string): string {
  return `AUTOPILOT MODE. Work autonomously toward this goal:

${goal}

Rules:
- Do real work now (plan briefly, then execute). Verify what you build.
- kikkoCode will automatically tell you to continue after each round.
- Only when the goal is FULLY achieved and verified, end your reply with the exact token ${DONE_MARKER} on its own line. Never write that token otherwise.`;
}

const CONTINUE_PROMPT = `Continue with the autopilot goal. Re-check what is still missing, then do the next chunk of work. Remember: end with ${DONE_MARKER} (alone on a line) only when the goal is fully achieved and verified.`;

/** Sum of assistant-message costs for a session (USD), from the engine. */
async function sessionCost(sessionId: string): Promise<number> {
  const res = await getClient().session.messages({
    path: { id: sessionId },
    throwOnError: true,
  });
  let total = 0;
  for (const row of res.data ?? []) {
    const info = rowInfo(row);
    if (info?.role === "assistant") {
      total += (info as AssistantMessage).cost ?? 0;
    }
  }
  return total;
}

/** Text of the last assistant message (to spot the DONE marker). */
async function lastAssistantText(sessionId: string): Promise<string> {
  const res = await getClient().session.messages({
    path: { id: sessionId },
    throwOnError: true,
  });
  const rows = res.data ?? [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const info = rowInfo(rows[i]);
    if (info?.role === "assistant") {
      const parts = ((rows[i] as { parts?: Array<{ type: string; text?: string }> })
        .parts ?? []) as Array<{ type: string; text?: string }>;
      return parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n");
    }
  }
  return "";
}

/** Send a prompt directly (outside React), mirroring useSendPrompt's behavior. */
async function sendDirect(sessionId: string, text: string): Promise<void> {
  useChatStore.getState().setSessionRunning(sessionId, true);
  try {
    // Use the explicitly selected model, like the normal send path (our own
    // store wins over the engine config, which auth plugins can pin).
    let selected = useModelStore.getState().selected ?? "";
    if (!selected) {
      const cfg = (await getClient().config.get({ throwOnError: true })).data as {
        model?: string;
      };
      selected = cfg?.model ?? "";
    }
    const { providerID, modelID } = splitModel(selected);
    await getClient().session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text }],
        ...(modelID && providerID ? { model: { modelID, providerID } } : {}),
        agent: "build",
      },
      throwOnError: true,
    });
  } catch (e) {
    useChatStore.getState().setSessionRunning(sessionId, false);
    throw e;
  }
}

/** Kick off an autopilot run in `sessionId` with the given goal and caps. */
export async function startAutopilot(
  sessionId: string,
  goal: string,
  budgetUsd: number,
  maxIters: number,
): Promise<void> {
  const baseline = await sessionCost(sessionId).catch(() => 0);
  useAutopilotStore.getState().start({
    sessionId,
    goal,
    budgetUsd,
    maxIters,
    baselineCost: baseline,
  });
  await sendDirect(sessionId, autopilotPreamble(goal));
}

/** Stop the run (user action). Does not abort the in-flight step. */
export function stopAutopilot(): void {
  const st = useAutopilotStore.getState();
  if (st.active) st.finish("stopped");
}

/**
 * Called on every session.idle: decide whether the autopilot continues,
 * finishes, or hits a cap. No-op unless an autopilot run owns this session.
 */
export async function autopilotOnIdle(sessionId: string): Promise<void> {
  const st = useAutopilotStore.getState();
  if (!st.active || st.sessionId !== sessionId) return;

  // Fuel gauge first: how much has this run burned?
  const cost = await sessionCost(sessionId).catch(() => st.baselineCost);
  const spent = Math.max(0, cost - st.baselineCost);
  useAutopilotStore.getState().setSpent(spent);

  const text = await lastAssistantText(sessionId).catch(() => "");
  const store = useAutopilotStore.getState();
  if (!store.active || store.sessionId !== sessionId) return; // stopped meanwhile

  if (text.includes(DONE_MARKER)) {
    store.finish("done");
    void notifyWhenUnfocused("kikkoCode — Autopilot", "Goal achieved ✔");
    // Automatic quality pass: if a page is being previewed, run one design
    // audit → fix round so the result gets a final polish "for free".
    const previewUrl = usePreviewStore.getState().previewUrl;
    if (previewUrl) void runDesignAudit(sessionId, previewUrl).catch(() => {});
    return;
  }
  if (spent >= store.budgetUsd) {
    store.finish("budget");
    void notifyWhenUnfocused(
      "kikkoCode — Autopilot",
      `Budget reached ($${spent.toFixed(2)}) — stopped.`,
    );
    return;
  }
  if (store.iter >= store.maxIters) {
    store.finish("max-iters");
    void notifyWhenUnfocused(
      "kikkoCode — Autopilot",
      `Iteration cap (${store.maxIters}) reached — stopped.`,
    );
    return;
  }

  store.bumpIter();
  await sendDirect(sessionId, CONTINUE_PROMPT).catch(() => {
    useAutopilotStore.getState().finish("stopped");
  });
}
