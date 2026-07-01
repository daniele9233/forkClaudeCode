import { useEffect } from "react";
import type { EventMessagePartUpdated } from "@opencode-ai/sdk/client";
import { onEventType } from "@/opencode/events";
import { useTerminalStore } from "@/stores/terminal.store";
import { onDevUrlDetected } from "@/opencode/preview";
import { detectDevServerUrl } from "./detectDevServer";

/**
 * Mount once (in ChatShell) to capture the output of bash commands the agent
 * runs and feed them into the terminal store. Also scans output for a local
 * dev-server URL and surfaces it via the preview store. Stays mounted
 * regardless of whether the terminal panel is visible, so no output is lost.
 */
export function useTerminalEvents() {
  const addEntry = useTerminalStore((s) => s.addEntry);

  useEffect(() => {
    const scanForDevServer = (text: string | undefined) => {
      if (!text) return;
      const url = detectDevServerUrl(text);
      // The URL the dev server printed is authoritative → show it in the preview.
      if (url) onDevUrlDetected(url);
    };

    const unsub = onEventType<EventMessagePartUpdated>("message.part.updated", (e) => {
      const part = e.properties.part;
      if (part.type !== "tool") return;
      if (!part.tool.toLowerCase().includes("bash")) return;

      const state = part.state;
      const input =
        state.status !== "pending"
          ? (state.input as Record<string, unknown> | undefined)
          : undefined;
      const command =
        input && typeof input.command === "string" ? input.command : part.tool;

      if (state.status === "completed") {
        addEntry({ id: part.id, command, output: state.output });
        scanForDevServer(state.output);
      } else if (state.status === "error") {
        addEntry({ id: part.id, command, error: state.error });
        scanForDevServer(state.error);
      } else if (state.status === "running" && state.metadata) {
        // Long-running processes (dev servers) never reach "completed" — scan
        // any streaming output the engine exposes via metadata.
        scanForDevServer(JSON.stringify(state.metadata));
      }
    });
    return unsub;
  }, [addEntry]);
}
