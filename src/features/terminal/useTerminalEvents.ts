import { useEffect } from "react";
import type { EventMessagePartUpdated } from "@opencode-ai/sdk/client";
import { onEventType } from "@/opencode/events";
import { useTerminalStore } from "@/stores/terminal.store";

/**
 * Mount once (in ChatShell) to capture the output of bash commands the agent
 * runs and feed them into the terminal store. Stays mounted regardless of
 * whether the terminal panel is visible, so no output is lost.
 */
export function useTerminalEvents() {
  const addEntry = useTerminalStore((s) => s.addEntry);

  useEffect(() => {
    const unsub = onEventType<EventMessagePartUpdated>("message.part.updated", (e) => {
      const part = e.properties.part;
      if (part.type !== "tool") return;
      if (!part.tool.toLowerCase().includes("bash")) return;

      const state = part.state;
      if (state.status === "completed") {
        const command =
          typeof state.input?.command === "string" ? state.input.command : part.tool;
        addEntry({ id: part.id, command, output: state.output });
      } else if (state.status === "error") {
        const command =
          typeof state.input?.command === "string" ? state.input.command : part.tool;
        addEntry({ id: part.id, command, error: state.error });
      }
    });
    return unsub;
  }, [addEntry]);
}
